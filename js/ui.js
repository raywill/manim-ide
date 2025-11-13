/**
 * Manim Visual Editor - UI模块
 * 负责用户界面交互、工具箱和属性面板
 */

/**
 * 初始化UI
 */
let multiSelectionIndicator = null;
let drawingMagnifier = null;

const DRAWING_MAGNIFIER_CONFIG = {
    size: 100,
    zoom: 10,
    position: {
        top: null,
        right: null,
        bottom: 24,
        left: 24
    },
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    crosshairColor: 'rgba(52, 152, 219, 0.75)'
};

const BACKEND_ENDPOINT = window.ManimBackendConfig?.backendEndpoint || 'canvas.php';
const PASSKEY_SUPPORTED = typeof window.PublicKeyCredential === 'function';

const backendAuthState = {
    loggedIn: false,
    userId: null,
    displayName: '',
    isShared: false,
    shareUrl: null,
    lastUpdatedAt: null,
    lastSavedSnapshot: null
};

let backendUIRefs = null;
let backendAvailable = true;
let shareViewerActive = false;
let settingsMenuInitialized = false;

function isShareViewerMode() {
    return shareViewerActive;
}

function initUI() {
    initToolbox();
    initPropertyPanel();
    initCanvasEvents();
    initKeyboardShortcuts();
    initToolbarButtons();
    initSelectionIndicator();
    initDrawingMagnifier();
    initBackendIntegration();
}

/**
 * 初始化多选状态提示
 */
function initSelectionIndicator() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    multiSelectionIndicator = document.createElement('div');
    multiSelectionIndicator.id = 'multi-selection-indicator';
    multiSelectionIndicator.className = 'selection-indicator hidden';
    multiSelectionIndicator.innerHTML = `
        <span class="selection-count"></span>
        <span class="selection-tip">（属性面板已隐藏）</span>
    `;
    container.appendChild(multiSelectionIndicator);
}

function initDrawingMagnifier() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'drawing-magnifier';
    wrapper.className = 'canvas-magnifier hidden';

    // 使用 CSS 变量设置默认尺寸，便于后期覆盖
    wrapper.style.setProperty('--magnifier-size', `${DRAWING_MAGNIFIER_CONFIG.size}px`);

    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = DRAWING_MAGNIFIER_CONFIG.size;
    previewCanvas.height = DRAWING_MAGNIFIER_CONFIG.size;
    previewCanvas.className = 'canvas-magnifier__canvas';

    wrapper.appendChild(previewCanvas);
    container.appendChild(wrapper);

    const ctx = previewCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    drawingMagnifier = {
        root: wrapper,
        canvas: previewCanvas,
        ctx,
        sampleSize: Math.max(1, DRAWING_MAGNIFIER_CONFIG.size / DRAWING_MAGNIFIER_CONFIG.zoom),
        config: {
            ...DRAWING_MAGNIFIER_CONFIG,
            position: { ...DRAWING_MAGNIFIER_CONFIG.position }
        }
    };

    setDrawingMagnifierPosition({ ...drawingMagnifier.config.position });

    if (!ManimEditor.uiComponents) {
        ManimEditor.uiComponents = {};
    }

    ManimEditor.uiComponents.magnifier = {
        show: showDrawingMagnifier,
        hide: hideDrawingMagnifier,
        update: updateDrawingMagnifier,
        setPosition: setDrawingMagnifierPosition,
        getPosition: () => ({ ...drawingMagnifier.config.position }),
        getConfig: () => ({ ...drawingMagnifier.config })
    };
}

function formatMagnifierPositionValue(value) {
    if (value === null || value === undefined) return '';
    return typeof value === 'number' ? `${value}px` : String(value);
}

function setDrawingMagnifierPosition(position = {}) {
    if (!drawingMagnifier || !drawingMagnifier.root) return;
    const keys = ['top', 'right', 'bottom', 'left'];
    keys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(position, key)) {
            drawingMagnifier.config.position[key] = position[key];
        }
    });

    // 当设置 top/left 时，自动清除对应的 bottom/right，反之亦然，便于重新定位
    if (Object.prototype.hasOwnProperty.call(position, 'top') && !Object.prototype.hasOwnProperty.call(position, 'bottom')) {
        drawingMagnifier.config.position.bottom = null;
    }
    if (Object.prototype.hasOwnProperty.call(position, 'bottom') && !Object.prototype.hasOwnProperty.call(position, 'top')) {
        drawingMagnifier.config.position.top = null;
    }
    if (Object.prototype.hasOwnProperty.call(position, 'left') && !Object.prototype.hasOwnProperty.call(position, 'right')) {
        drawingMagnifier.config.position.right = null;
    }
    if (Object.prototype.hasOwnProperty.call(position, 'right') && !Object.prototype.hasOwnProperty.call(position, 'left')) {
        drawingMagnifier.config.position.left = null;
    }

    keys.forEach(key => {
        const cssVar = `--magnifier-${key}`;
        const stored = drawingMagnifier.config.position[key];
        if (stored === null || stored === undefined) {
            drawingMagnifier.root.style.removeProperty(cssVar);
        } else {
            drawingMagnifier.root.style.setProperty(cssVar, formatMagnifierPositionValue(stored));
        }
    });
}

function showDrawingMagnifier() {
    if (!drawingMagnifier || !drawingMagnifier.root) return;
    drawingMagnifier.root.classList.remove('hidden');
}

function hideDrawingMagnifier() {
    if (!drawingMagnifier || !drawingMagnifier.root) return;
    drawingMagnifier.root.classList.add('hidden');
}

function updateDrawingMagnifier(canvasX, canvasY) {
    if (!drawingMagnifier || !drawingMagnifier.ctx || !ManimEditor.canvas) return;
    const { ctx, sampleSize, config } = drawingMagnifier;
    const size = config.size;
    if (sampleSize <= 0 || size <= 0) return;

    const mainCanvas = ManimEditor.canvas;

    let sx = canvasX - sampleSize / 2;
    let sy = canvasY - sampleSize / 2;

    // 边缘裁剪
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + sampleSize > mainCanvas.width) {
        sx = Math.max(0, mainCanvas.width - sampleSize);
    }
    if (sy + sampleSize > mainCanvas.height) {
        sy = Math.max(0, mainCanvas.height - sampleSize);
    }

    ctx.save();
    ctx.fillStyle = config.backgroundColor;
    ctx.clearRect(0, 0, size, size);
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mainCanvas, sx, sy, sampleSize, sampleSize, 0, 0, size, size);

    // 十字准星
    const mid = size / 2;
    ctx.strokeStyle = config.crosshairColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(size, mid);
    ctx.stroke();
    ctx.restore();
}

/**
 * 云端工作区与 Passkey 集成
 */
function initBackendIntegration() {
    backendUIRefs = {
        status: document.getElementById('auth-status'),
        shareIndicator: document.getElementById('share-status-indicator'),
        registerBtn: document.getElementById('register-passkey-btn'),
        loginBtn: document.getElementById('login-passkey-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        saveBtn: document.getElementById('save-workspace-btn'),
        shareBtn: document.getElementById('share-workspace-btn'),
        unshareBtn: document.getElementById('unshare-workspace-btn'),
        importBtn: document.getElementById('import-json-btn'),
        exportJsonBtn: document.getElementById('export-json-btn'),
        exportManimBtn: document.getElementById('export-btn'),
        menuBtn: document.getElementById('settings-btn'),
        menuDropdown: document.getElementById('settings-dropdown')
    };

    setupSettingsMenu();

    if (!backendUIRefs.status) {
        backendAvailable = false;
        return;
    }

    if (!BACKEND_ENDPOINT) {
        backendAvailable = false;
        backendUIRefs.status.textContent = '云端未配置';
        updateBackendUI();
        return;
    }

    if (!PASSKEY_SUPPORTED) {
        backendAvailable = false;
        backendUIRefs.status.textContent = '浏览器不支持 Passkey';
        updateBackendUI();
        return;
    }

    backendUIRefs.registerBtn?.addEventListener('click', startPasskeyRegistration);
    backendUIRefs.loginBtn?.addEventListener('click', startPasskeyLogin);
    backendUIRefs.logoutBtn?.addEventListener('click', handleBackendLogout);
    backendUIRefs.saveBtn?.addEventListener('click', handleSaveWorkspace);
    backendUIRefs.shareBtn?.addEventListener('click', handleShareWorkspace);
    backendUIRefs.unshareBtn?.addEventListener('click', handleUnshareWorkspace);

    updateBackendUI();
    fetchAuthSession();
}

function updateBackendUI() {
    if (!backendUIRefs || !backendUIRefs.status) return;

    if (!backendAvailable) {
        backendUIRefs.status.textContent = PASSKEY_SUPPORTED ? '云端不可用' : backendUIRefs.status.textContent;
        backendUIRefs.registerBtn?.classList.add('hidden');
        backendUIRefs.loginBtn?.classList.add('hidden');
        backendUIRefs.logoutBtn?.classList.add('hidden');
        backendUIRefs.saveBtn?.classList.add('hidden');
        backendUIRefs.shareBtn?.classList.add('hidden');
        backendUIRefs.unshareBtn?.classList.add('hidden');
        backendUIRefs.shareIndicator?.classList.add('hidden');
        closeSettingsMenu();
        return;
    }

    if (!backendAuthState.loggedIn) {
        backendUIRefs.status.textContent = '未登录';
        backendUIRefs.registerBtn?.classList.remove('hidden');
        backendUIRefs.loginBtn?.classList.remove('hidden');
        backendUIRefs.logoutBtn?.classList.add('hidden');
        backendUIRefs.saveBtn?.classList.add('hidden');
        backendUIRefs.shareBtn?.classList.add('hidden');
        backendUIRefs.unshareBtn?.classList.add('hidden');
        backendUIRefs.shareIndicator?.classList.add('hidden');
        closeSettingsMenu();
        return;
    }

    const label = backendAuthState.displayName || (backendAuthState.userId ? `用户 #${backendAuthState.userId}` : '已登录');
    backendUIRefs.status.textContent = `已登录：${label}`;
    backendUIRefs.registerBtn?.classList.add('hidden');
    backendUIRefs.loginBtn?.classList.add('hidden');
    backendUIRefs.logoutBtn?.classList.remove('hidden');
    backendUIRefs.saveBtn?.classList.remove('hidden');
    backendUIRefs.shareBtn?.classList.remove('hidden');
    backendUIRefs.unshareBtn?.classList.toggle('hidden', !backendAuthState.isShared);
    backendUIRefs.shareIndicator?.classList.toggle('hidden', !backendAuthState.isShared);
    closeSettingsMenu();
}

function buildBackendUrl(action, params = {}) {
    let endpoint = BACKEND_ENDPOINT || 'canvas.php';
    let url;
    if (/^https?:\/\//i.test(endpoint)) {
        url = new URL(endpoint);
    } else {
        url = new URL(endpoint, window.location.origin);
    }
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });
    return url.toString();
}

async function backendRequest(action, { method = 'GET', body = null, params = {} } = {}) {
    const url = buildBackendUrl(action, params);
    const fetchOptions = {
        method,
        credentials: 'include',
        headers: {}
    };

    if (method === 'POST') {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body ?? {});
    }

    let response;
    try {
        response = await fetch(url, fetchOptions);
        backendAvailable = true;
    } catch (error) {
        backendAvailable = false;
        updateBackendUI();
        throw new Error('无法连接服务器');
    }

    const text = await response.text();
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('解析服务器响应失败', parseError, text);
            throw new Error('服务器返回格式无效');
        }
    }

    if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : response.statusText;
        throw new Error(message || '请求失败');
    }

    return data;
}

function backendGet(action, params) {
    return backendRequest(action, { method: 'GET', params });
}

function backendPost(action, body, params) {
    return backendRequest(action, { method: 'POST', body, params });
}

function base64urlToUint8Array(base64url) {
    const padding = base64url.length % 4;
    let base64 = base64url;
    if (padding > 0) {
        base64 += '='.repeat(4 - padding);
    }
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const outputArray = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        outputArray[i] = raw.charCodeAt(i);
    }
    return outputArray;
}

function uint8ArrayToBase64url(buffer) {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function prepareCreationOptions(options) {
    if (!options) return null;
    const publicKey = { ...options };
    publicKey.challenge = base64urlToUint8Array(options.challenge);
    if (publicKey.user && publicKey.user.id) {
        publicKey.user = { ...publicKey.user, id: base64urlToUint8Array(publicKey.user.id) };
    }
    if (Array.isArray(publicKey.excludeCredentials)) {
        publicKey.excludeCredentials = publicKey.excludeCredentials.map(item => ({
            ...item,
            id: base64urlToUint8Array(item.id)
        }));
    }
    return publicKey;
}

function prepareRequestOptions(options) {
    if (!options) return null;
    const publicKey = { ...options };
    publicKey.challenge = base64urlToUint8Array(options.challenge);
    if (Array.isArray(publicKey.allowCredentials)) {
        publicKey.allowCredentials = publicKey.allowCredentials.map(item => ({
            ...item,
            id: base64urlToUint8Array(item.id)
        }));
    }
    return publicKey;
}

function credentialToJSON(credential) {
    if (!credential) return null;
    const json = {
        id: credential.id,
        type: credential.type,
        rawId: credential.rawId ? uint8ArrayToBase64url(credential.rawId) : null,
        response: {}
    };

    if (credential.response) {
        const response = credential.response;
        if (response.clientDataJSON) {
            json.response.clientDataJSON = uint8ArrayToBase64url(response.clientDataJSON);
        }
        if (response.attestationObject) {
            json.response.attestationObject = uint8ArrayToBase64url(response.attestationObject);
        }
        if (response.authenticatorData) {
            json.response.authenticatorData = uint8ArrayToBase64url(response.authenticatorData);
        }
        if (response.signature) {
            json.response.signature = uint8ArrayToBase64url(response.signature);
        }
        if (response.userHandle) {
            json.response.userHandle = uint8ArrayToBase64url(response.userHandle);
        }
    }

    return json;
}

async function startPasskeyRegistration() {
    if (!PASSKEY_SUPPORTED) {
        notifyUser('当前环境不支持 Passkey', true);
        return;
    }
    closeSettingsMenu();
    try {
        const displayName = prompt('请输入显示名称（可选）', backendAuthState.displayName || '') || undefined;
        const options = await backendPost('auth_register_options', displayName ? { displayName } : {});
        const credential = await navigator.credentials.create({
            publicKey: prepareCreationOptions(options)
        });
        const verification = credentialToJSON(credential);
        const verifyResult = await backendPost('auth_register_verify', verification);
        backendAuthState.loggedIn = !!verifyResult.loggedIn;
        backendAuthState.userId = verifyResult.userId ?? null;
        backendAuthState.displayName = displayName || backendAuthState.displayName;
        await fetchAuthSession();
        notifyUser('Passkey 注册成功');
    } catch (error) {
        handleBackendError(error, '注册失败');
    }
}

async function startPasskeyLogin() {
    if (!PASSKEY_SUPPORTED) {
        notifyUser('当前环境不支持 Passkey', true);
        return;
    }
    closeSettingsMenu();
    try {
        const options = await backendGet('auth_login_options');
        if (Array.isArray(options.allowCredentials) && options.allowCredentials.length === 0) {
            notifyUser('暂无可用凭据，请先完成注册', true);
            return;
        }
        const assertion = await navigator.credentials.get({
            publicKey: prepareRequestOptions(options)
        });
        const verification = credentialToJSON(assertion);
        const verifyResult = await backendPost('auth_login_verify', verification);
        backendAuthState.loggedIn = !!verifyResult.loggedIn;
        backendAuthState.userId = verifyResult.userId ?? null;
        await fetchAuthSession();
        notifyUser('登录成功');
    } catch (error) {
        handleBackendError(error, '登录失败');
    }
}

async function handleBackendLogout() {
    closeSettingsMenu();
    try {
        await backendPost('auth_logout', {});
    } catch (error) {
        console.warn('注销失败', error);
    }
    backendAuthState.loggedIn = false;
    backendAuthState.userId = null;
    backendAuthState.displayName = '';
    backendAuthState.isShared = false;
    backendAuthState.shareUrl = null;
    backendAuthState.lastUpdatedAt = null;
    backendAuthState.lastSavedSnapshot = null;
    updateBackendUI();
}

async function fetchAuthSession() {
    if (!PASSKEY_SUPPORTED || !BACKEND_ENDPOINT) {
        return;
    }
    try {
        const session = await backendGet('auth_session');
        if (!session.loggedIn) {
            backendAuthState.loggedIn = false;
            backendAuthState.userId = null;
            backendAuthState.displayName = '';
            backendAuthState.isShared = false;
            backendAuthState.shareUrl = null;
            backendAuthState.lastUpdatedAt = null;
            backendAuthState.lastSavedSnapshot = null;
            updateBackendUI();
            return;
        }
        backendAuthState.loggedIn = true;
        backendAuthState.userId = session.userId ?? null;
        backendAuthState.displayName = session.displayName || session.username || backendAuthState.displayName;
        await refreshCanvasMeta({ loadCanvas: !isShareViewerMode() });
    } catch (error) {
        backendAvailable = false;
        console.warn('获取会话失败', error);
        updateBackendUI();
    }
}

async function refreshCanvasMeta(options = {}) {
    if (!backendAuthState.loggedIn) {
        updateBackendUI();
        return null;
    }
    try {
        const info = await backendGet('canvas_get');
        backendAuthState.isShared = !!info.isShared;
        backendAuthState.shareUrl = info.shareUrl || null;
        backendAuthState.lastUpdatedAt = info.updatedAt || null;
        updateBackendUI();
        if (options.loadCanvas && info && info.contentJson && !isShareViewerMode()) {
            applyCloudCanvas(info.contentJson);
        }
        return info;
    } catch (error) {
        console.warn('获取画布信息失败', error);
        updateBackendUI();
        return null;
    }
}

async function handleSaveWorkspace() {
    if (!backendAuthState.loggedIn) {
        notifyUser('请先登录', true);
        return;
    }
    closeSettingsMenu();
    try {
        const payload = {
            contentJson: JSON.stringify(exportToJSON())
        };
        const result = await backendPost('canvas_save', payload);
        backendAuthState.isShared = !!result.isShared;
        if (result.shareUrl) {
            backendAuthState.shareUrl = result.shareUrl;
        }
        backendAuthState.lastUpdatedAt = result.updatedAt || backendAuthState.lastUpdatedAt;
        markCloudSaved();
        updateBackendUI();
        notifyUser('已保存到云端');
    } catch (error) {
        handleBackendError(error, '保存失败');
    }
}

function applyCloudCanvas(contentJson) {
    if (!contentJson) return;
    try {
        const parsed = JSON.parse(contentJson);
        importFromJSON(parsed);
        markCloudSaved(getCanvasSnapshot());
        console.log('[云端] 已加载最新画布');
    } catch (error) {
        console.error('解析云端画布失败', error);
        notifyUser('加载云端画布失败：数据格式无效', true);
    }
}

async function handleShareWorkspace() {
    if (!backendAuthState.loggedIn) {
        notifyUser('请先登录', true);
        return;
    }
    closeSettingsMenu();
    try {
        const payload = {
            contentJson: JSON.stringify(exportToJSON())
        };
        const result = await backendPost('canvas_share', payload);
        backendAuthState.isShared = true;
        backendAuthState.shareUrl = result.shareUrl || backendAuthState.shareUrl;
        backendAuthState.lastUpdatedAt = result.updatedAt || backendAuthState.lastUpdatedAt;
        markCloudSaved();
        updateBackendUI();
        displayShareLink(backendAuthState.shareUrl);
    } catch (error) {
        handleBackendError(error, '分享失败');
    }
}

async function handleUnshareWorkspace() {
    if (!backendAuthState.loggedIn) {
        notifyUser('请先登录', true);
        return;
    }
    closeSettingsMenu();
    try {
        await backendPost('canvas_unshare', {});
        backendAuthState.isShared = false;
        backendAuthState.shareUrl = null;
        updateBackendUI();
        notifyUser('已取消分享');
    } catch (error) {
        handleBackendError(error, '取消分享失败');
    }
}

function displayShareLink(shareUrl) {
    if (!shareUrl) {
        notifyUser('分享成功，但未获取到分享链接', true);
        return;
    }
    const message = `分享链接已生成：\n${shareUrl}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            notifyUser(`${message}\n已复制到剪贴板`, true);
        }).catch(() => {
            notifyUser(message, true);
        });
    } else {
        notifyUser(message, true);
    }
}

function handleBackendError(error, fallbackMessage) {
    const message = error && error.message ? error.message : fallbackMessage;
    console.error(fallbackMessage, error);
    notifyUser(`${fallbackMessage}：${message}`, true);
}

function notifyUser(message, forceAlert = false) {
    console.log(`[云端] ${message}`);
    if (forceAlert && typeof window !== 'undefined') {
        window.alert(message);
    }
}

async function initializeShareViewer() {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share_token');
    if (!shareToken) {
        return;
    }

    shareViewerActive = true;

    try {
        const data = await backendGet('share_view', { token: shareToken });
        if (!data || !data.contentJson) {
            notifyUser('分享的画布不存在或已取消分享', true);
            return;
        }
        const parsed = JSON.parse(data.contentJson);
        importFromJSON(parsed);
        enterShareReadonlyMode();
        notifyUser('正在查看共享画布（只读模式）');
    } catch (error) {
        handleBackendError(error, '加载共享画布失败');
    }
}

function enterShareReadonlyMode() {
    document.body.classList.add('share-readonly');
    const editButtons = document.querySelectorAll('.toolbar-center button, #shape-tools .tool-btn, #delete-btn, #clear-btn');
    editButtons.forEach(btn => {
        if (btn) {
            btn.disabled = true;
        }
    });
    const propertyPanelBtn = document.getElementById('close-panel-btn');
    if (propertyPanelBtn) {
        propertyPanelBtn.disabled = true;
    }
    const panel = document.getElementById('property-panel');
    if (panel) {
        panel.classList.add('hidden');
    }
    ManimEditor.mode = 'select';
}

window.initializeShareViewer = initializeShareViewer;
window.hasUnsavedCloudChanges = hasUnsavedCloudChanges;

function setupSettingsMenu() {
    if (settingsMenuInitialized) return;
    if (!backendUIRefs?.menuBtn || !backendUIRefs?.menuDropdown) return;

    backendUIRefs.menuBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSettingsMenu();
    });

    backendUIRefs.menuDropdown.addEventListener('click', (event) => {
        if (event.target.closest('button')) {
            closeSettingsMenu();
        }
    });

    document.addEventListener('click', (event) => {
        if (!backendUIRefs?.menuDropdown || backendUIRefs.menuDropdown.classList.contains('hidden')) {
            return;
        }
        if (!event.target.closest('.settings-menu')) {
            closeSettingsMenu();
        }
    });

    settingsMenuInitialized = true;
}

function toggleSettingsMenu() {
    if (!backendUIRefs?.menuDropdown || !backendUIRefs?.menuBtn) return;
    const shouldOpen = backendUIRefs.menuDropdown.classList.contains('hidden');
    backendUIRefs.menuDropdown.classList.toggle('hidden', !shouldOpen);
    backendUIRefs.menuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function closeSettingsMenu() {
    if (!backendUIRefs?.menuDropdown || !backendUIRefs?.menuBtn) return;
    if (!backendUIRefs.menuDropdown.classList.contains('hidden')) {
        backendUIRefs.menuDropdown.classList.add('hidden');
        backendUIRefs.menuBtn.setAttribute('aria-expanded', 'false');
    }
}

function getCanvasSnapshot() {
    try {
        if (!window.ManimEditor || !Array.isArray(ManimEditor.elements)) {
            return null;
        }
        return JSON.stringify(ManimEditor.elements);
    } catch (error) {
        console.warn('生成画布快照失败', error);
        return null;
    }
}

function markCloudSaved(snapshotOverride) {
    if (!backendAuthState.loggedIn) {
        backendAuthState.lastSavedSnapshot = null;
        return;
    }
    backendAuthState.lastSavedSnapshot = snapshotOverride !== undefined ? snapshotOverride : getCanvasSnapshot();
}

function hasUnsavedCloudChanges() {
    if (!backendAuthState.loggedIn || shareViewerActive) return false;
    const current = getCanvasSnapshot();
    if (current === null) return false;
    if (!backendAuthState.lastSavedSnapshot) {
        return Array.isArray(ManimEditor?.elements) && ManimEditor.elements.length > 0;
    }
    return current !== backendAuthState.lastSavedSnapshot;
}

/**
 * 获取当前选中数量
 */
function getSelectionCount() {
    return ManimEditor.selectedElementIds?.length || 0;
}

/**
 * 获取当前主选中的元素（仅当选中数量为1时返回元素）
 */
function getPrimarySelectedElement() {
    if (getSelectionCount() !== 1) return null;
    const id = ManimEditor.selectedElementIds[0];
    return ManimEditor.getElementById(id);
}

/**
 * 根据ID集合更新选中状态
 */
function setSelectionByIds(ids, options = {}) {
    const { skipRender = false } = options;
    ManimEditor.setSelectionIds(ids);
    refreshSelectionUI();
    if (!skipRender) {
        render();
    }
}

/**
 * 单独选中一个元素
 */
function selectSingleElement(element, options = {}) {
    if (!element) {
        clearSelection(options);
        return;
    }
    setSelectionByIds([element.id], options);
}

/**
 * 向选中集合添加元素
 */
function addElementToSelection(element, options = {}) {
    if (!element) return;
    if (!ManimEditor.isElementSelected(element.id)) {
        ManimEditor.addToSelection(element.id);
    }
    refreshSelectionUI();
    if (!options.skipRender) {
        render();
    }
}

/**
 * 切换元素的选中状态
 */
function toggleElementSelection(element, options = {}) {
    if (!element) return;
    if (ManimEditor.isElementSelected(element.id)) {
        ManimEditor.removeFromSelection(element.id);
    } else {
        ManimEditor.addToSelection(element.id);
    }
    refreshSelectionUI();
    if (!options.skipRender) {
        render();
    }
}

/**
 * 清空选中状态
 */
function clearSelection(options = {}) {
    const { skipRender = false } = options;
    const hadSelection = getSelectionCount() > 0;
    ManimEditor.clearSelection();
    refreshSelectionUI({ clearPanel: hadSelection });
    if (!skipRender) {
        render();
    }
}

/**
 * 更新属性面板与多选提示
 */
function refreshSelectionUI(options = {}) {
    const { clearPanel = false } = options;
    const count = getSelectionCount();
    
    if (count === 1) {
        const element = getPrimarySelectedElement();
        if (element) {
            showPropertyPanel(element);
        }
        hideMultiSelectionIndicator();
    } else if (count > 1) {
        hidePropertyPanel({ preserveSelection: true });
        showMultiSelectionIndicator(count);
    } else {
        hideMultiSelectionIndicator();
        hidePropertyPanel({ preserveSelection: true });
    }
}

/**
 * 显示多选提示
 */
function showMultiSelectionIndicator(count) {
    if (!multiSelectionIndicator) return;
    const countSpan = multiSelectionIndicator.querySelector('.selection-count');
    if (countSpan) {
        countSpan.textContent = `已选中 ${count} 个对象`;
    }
    multiSelectionIndicator.classList.remove('hidden');
}

/**
 * 隐藏多选提示
 */
function hideMultiSelectionIndicator() {
    if (!multiSelectionIndicator) return;
    multiSelectionIndicator.classList.add('hidden');
}

/**
 * 对单个元素应用平移增量（单位：Manim坐标）
 */
function applyMoveDeltaToElement(element, deltaX, deltaY, options = {}) {
    if (!element || (deltaX === 0 && deltaY === 0)) return;
    const { skipHistory = true } = options;
    const plugin = ManimEditor.shapeRegistry[element.type];
    let newProps = null;
    
    if (plugin && plugin.handleMove) {
        let anchor = undefined;
        if (plugin.getMoveAnchor) {
            anchor = plugin.getMoveAnchor(element);
        }
        
        if (anchor === null) {
            // 使用增量移动
            newProps = plugin.handleMove(element, {
                deltaX,
                deltaY,
                currentPoint: { x: 0, y: 0 },
                offset: { x: 0, y: 0 }
            }, ManimEditor);
        } else {
            const baseAnchor = anchor || { 
                x: element.props.x !== undefined ? element.props.x : 0,
                y: element.props.y !== undefined ? element.props.y : 0
            };
            const currentPoint = {
                x: baseAnchor.x + deltaX,
                y: baseAnchor.y + deltaY
            };
            newProps = plugin.handleMove(element, {
                currentPoint,
                offset: { x: 0, y: 0 },
                deltaX,
                deltaY
            }, ManimEditor);
        }
    }
    
    if (!newProps || typeof newProps !== 'object') {
        const fallback = {};
        if (element.props.x !== undefined) fallback.x = element.props.x + deltaX;
        if (element.props.y !== undefined) fallback.y = element.props.y + deltaY;
        newProps = fallback;
    }
    
    if (newProps && Object.keys(newProps).length > 0) {
        updateElement(element.id, newProps, skipHistory);
    }
}

/**
 * 对选中集合应用平移增量（单位：Manim坐标）
 */
function applyMoveDeltaToSelection(deltaX, deltaY, options = {}) {
    if (deltaX === 0 && deltaY === 0) return;
    const elements = ManimEditor.getSelectedElements();
    elements.forEach(element => applyMoveDeltaToElement(element, deltaX, deltaY, options));
}

/**
 * 归一化矩形（确保宽高为正值）
 */
function normalizeRect(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };
}

/**
 * 判断两个矩形是否相交
 */
function rectsIntersect(a, b) {
    if (!a || !b) return false;
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

/**
 * 收集落入指定画布矩形内的元素ID
 */
function collectElementsInRect(rect) {
    if (!rect || rect.w === 0 || rect.h === 0) return [];
    const tolerancePx = (ManimEditor.pxPerUnit || 70) * 0.3;
    const expanded = {
        x: rect.x - tolerancePx,
        y: rect.y - tolerancePx,
        w: rect.w + tolerancePx * 2,
        h: rect.h + tolerancePx * 2
    };
    
    return ManimEditor.elements
        .filter(element => {
            const plugin = ManimEditor.shapeRegistry[element.type];
            if (!plugin || !plugin.getBounds) return false;
            const bounds = plugin.getBounds(element, ManimEditor);
            if (!bounds) return false;
            return rectsIntersect(bounds, expanded);
        })
        .map(element => element.id);
}

/**
 * 生成复制元素的唯一名称
 */
function generateCopyName(originalName, existingNames) {
    const names = existingNames || new Set();
    let base = originalName || 'element';
    if (!base.endsWith('_copy')) {
        base = `${base}_copy`;
    }
    let candidate = base;
    let counter = 2;
    while (names.has(candidate)) {
        candidate = `${base}_${counter++}`;
    }
    names.add(candidate);
    return candidate;
}

/**
 * 复制当前选中元素到剪贴板
 */
function copySelectionToClipboard() {
    const elements = ManimEditor.getSelectedElements();
    if (!elements || elements.length === 0) return;
    ManimEditor.clipboard = elements.map(element => JSON.parse(JSON.stringify(element)));
    console.log(`[Clipboard] 已复制 ${elements.length} 个元素`);
}

/**
 * 从剪贴板粘贴，并偏移指定像素
 */
function pasteFromClipboard() {
    const clipboard = ManimEditor.clipboard;
    if (!clipboard || clipboard.length === 0) return;
    
    const pxPerUnit = ManimEditor.pxPerUnit || 70;
    const offsetUnits = 50 / pxPerUnit;
    const offsetX = offsetUnits;
    const offsetY = -offsetUnits; // 画布向下为正，Manim坐标向上为正
    
    const existingNames = new Set(ManimEditor.elements.map(el => el.name));
    const newElements = [];
    
    clipboard.forEach(template => {
        const clone = JSON.parse(JSON.stringify(template));
        clone.id = ManimEditor.generateId();
        clone.name = generateCopyName(clone.name || clone.type, existingNames);
        existingNames.add(clone.name);
        ManimEditor.elements.push(clone);
        newElements.push(clone);
    });
    
    updateElementsOrder();
    newElements.forEach(element => applyMoveDeltaToElement(element, offsetX, offsetY, { skipHistory: true }));
    saveToHistory();
    
    const newIds = newElements.map(element => element.id);
    setSelectionByIds(newIds, { skipRender: true });
    render();
}

/**
 * 初始化工具箱
 */
function initToolbox() {
    const shapeToolsContainer = document.getElementById('shape-tools');
    
    // 为每个注册的形状创建按钮
    Object.values(ManimEditor.shapeRegistry).forEach(plugin => {
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.setAttribute('data-shape-type', plugin.type);
        btn.setAttribute('data-tooltip', plugin.name);  // 用于hover提示
        btn.setAttribute('title', plugin.name);  // 浏览器原生tooltip（备用）
        
        btn.innerHTML = `
            <span class="icon">${plugin.icon}</span>
            <span class="label">${plugin.name}</span>
        `;
        
        btn.addEventListener('click', () => {
            clearSelection({ skipRender: true });

            if (ManimEditor.mode === 'draw' && ManimEditor.currentShapeType === plugin.type) {
                // 如果已经是绘制此形状模式，则切换回选择模式
                setSelectMode();
                btn.classList.remove('active');
            } else {
                // 切换到绘制模式
                setDrawMode(plugin.type);
                
                // 更新按钮状态
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render();
            }
        });
        
        shapeToolsContainer.appendChild(btn);
    });
}

/**
 * 设置为选择模式
 */
function setSelectMode() {
    ManimEditor.mode = 'select';
    ManimEditor.currentShapeType = null;
    
    // 取消绘制状态（通用）
    ManimEditor.drawingState = null;
    ManimEditor.previewPoint = null;
    
    document.getElementById('canvas-container').classList.remove('draw-mode');
    document.getElementById('canvas-container').classList.add('select-mode');
    hideDrawingMagnifier();
    
    render();
}

/**
 * 设置为绘制模式
 */
function setDrawMode(shapeType) {
    ManimEditor.mode = 'draw';
    ManimEditor.currentShapeType = shapeType;
    document.getElementById('canvas-container').classList.add('draw-mode');
    document.getElementById('canvas-container').classList.remove('select-mode');
    showDrawingMagnifier();
}

/**
 * 初始化画布事件
 */
function initCanvasEvents() {
    const canvas = document.getElementById('main-canvas');
    const coordDisplay = document.getElementById('coord-display');
    
    let dragElement = null;
    let dragOffset = { x: 0, y: 0 };
    let dragMode = null;
    let dragSelection = null;
    let isDragging = false;
    let dragChanged = false;
    let isMarqueeSelecting = false;
    let marqueeStart = null;
    let marqueeAdditive = false;
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
        
        let displayText = `Manim: (${manimCoord.x.toFixed(2)}, ${manimCoord.y.toFixed(2)})`;
        if (ManimEditor.mode === 'draw') {
            const shapeName = ManimEditor.shapeRegistry[ManimEditor.currentShapeType]?.name || '图形';
            if (ManimEditor.drawingState) {
                displayText += ` | 正在绘制${shapeName}（双击完成，ESC取消）`;
            } else {
                displayText += ` | ${shapeName}绘制模式（ESC退出）`;
            }
        } else if (getSelectionCount() > 0) {
            displayText += ' | 按ESC取消选择';
        }
        
        coordDisplay.textContent = displayText;
        coordDisplay.classList.add('visible');

        if (ManimEditor.mode === 'draw' && ManimEditor.currentShapeType) {
            showDrawingMagnifier();
            updateDrawingMagnifier(canvasX, canvasY);
        } else {
            hideDrawingMagnifier();
        }
        
        if (isDragging) {
            if (dragMode === 'control-point' && dragElement) {
                const plugin = ManimEditor.shapeRegistry[dragElement.type];
                if (!plugin || !plugin.updateControlPoint) {
                    console.error(`插件 ${dragElement.type} 未实现 updateControlPoint()`);
                } else {
                    const cps = plugin.getControlPoints ? plugin.getControlPoints(dragElement, ManimEditor) : [];
                    const pointId = cps && cps[dragOffset.index] ? cps[dragOffset.index].id : dragOffset.index;
                    const newProps = plugin.updateControlPoint(dragElement, pointId, manimCoord.x, manimCoord.y, ManimEditor);
                    if (newProps && typeof newProps === 'object') {
                        updateElement(dragElement.id, newProps, true);
                        dragChanged = true;
                    }
                }
            } else if (dragMode === 'scale-handle' && dragElement) {
                handleScaleDrag(dragElement, dragOffset, manimCoord, true);
                dragChanged = true;
            } else if (dragMode === 'move-single' && dragElement) {
                const plugin = ManimEditor.shapeRegistry[dragElement.type];
                if (plugin && plugin.handleMove) {
                    const moveInfo = {
                        currentPoint: manimCoord,
                        offset: { x: dragOffset.x, y: dragOffset.y }
                    };
                    if (dragOffset.lastX !== undefined) {
                        const dx = manimCoord.x - dragOffset.x;
                        const dy = manimCoord.y - dragOffset.y;
                        moveInfo.deltaX = dx - dragOffset.lastX;
                        moveInfo.deltaY = dy - dragOffset.lastY;
                    }
                    const newProps = plugin.handleMove(dragElement, moveInfo, ManimEditor);
                    updateElement(dragElement.id, newProps, true);
                    if (dragOffset.lastX !== undefined) {
                        dragOffset.lastX = manimCoord.x - dragOffset.x;
                        dragOffset.lastY = manimCoord.y - dragOffset.y;
                    }
                } else {
                    updateElement(dragElement.id, {
                        x: manimCoord.x - dragOffset.x,
                        y: manimCoord.y - dragOffset.y
                    }, true);
                }
                dragChanged = true;
                if (getSelectionCount() === 1) {
                    updatePropertyPanel(dragElement);
                }
            } else if (dragMode === 'move-multi' && dragSelection) {
                const deltaX = manimCoord.x - dragSelection.lastPoint.x;
                const deltaY = manimCoord.y - dragSelection.lastPoint.y;
                if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                    applyMoveDeltaToSelection(deltaX, deltaY, { skipHistory: true });
                    dragSelection.lastPoint = manimCoord;
                    dragSelection.hasMoved = true;
                    dragChanged = true;
                }
            }
        }
        
        if (isMarqueeSelecting && marqueeStart) {
            const rectInfo = normalizeRect(marqueeStart.x, marqueeStart.y, canvasX, canvasY);
            ManimEditor.marqueeRect = rectInfo;
            ManimEditor.marqueePreviewIds = collectElementsInRect(rectInfo);
            render();
        }
        
        if (ManimEditor.isDrawing && ManimEditor.tempElement) {
            updateTempElement(canvasX, canvasY);
        }
        
        if (ManimEditor.drawingState && ManimEditor.drawingState.points) {
            ManimEditor.previewPoint = [manimCoord.x, manimCoord.y, 0];
            render();
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        coordDisplay.classList.remove('visible');
        hideDrawingMagnifier();
    });
    
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
        
        const clickedElement = findElementAtPoint(canvasX, canvasY);
        const selectionCount = getSelectionCount();
        const primaryElement = getPrimarySelectedElement();
        const isMetaKey = e.metaKey || e.ctrlKey;
        const isShiftKey = e.shiftKey;
        const additive = isMetaKey || isShiftKey;
        
        dragElement = null;
        dragMode = null;
        dragSelection = null;
        dragChanged = false;
        
        if (!additive && selectionCount === 1 && primaryElement) {
            const controlPoint = findControlPoint(canvasX, canvasY, primaryElement);
            if (controlPoint) {
                dragElement = primaryElement;
                isDragging = true;
                dragMode = controlPoint.type === 'curvePoint' ? 'control-point' : 'scale-handle';
                if (controlPoint.type === 'curvePoint') {
                    dragOffset = {
                        type: 'curvePoint',
                        index: controlPoint.index,
                        startX: manimCoord.x,
                        startY: manimCoord.y,
                        originalProps: JSON.parse(JSON.stringify(primaryElement.props))
                    };
                } else {
                    const originalProps = JSON.parse(JSON.stringify(primaryElement.props));
                    const fixedPoint = calculateFixedPoint(primaryElement, controlPoint.corner, originalProps);
                    dragOffset = {
                        type: 'scaleHandle',
                        corner: controlPoint.corner,
                        startX: manimCoord.x,
                        startY: manimCoord.y,
                        originalProps,
                        fixedPoint
                    };
                    if (window.debugScale) {
                        window.debugScale.log('mousedown', { fixedPoint, corner: controlPoint.corner });
                    }
                }
                render();
                return;
            }
        }
        
        if (ManimEditor.mode === 'draw') {
            if (clickedElement) {
                selectSingleElement(clickedElement);
                setSelectMode();
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                
                dragElement = clickedElement;
                isDragging = true;
                dragMode = 'move-single';
                
                const plugin = ManimEditor.shapeRegistry[clickedElement.type];
                const anchor = plugin && plugin.getMoveAnchor ? plugin.getMoveAnchor(clickedElement) : null;
                if (anchor === null) {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x,
                        y: manimCoord.y,
                        lastX: 0,
                        lastY: 0
                    };
                } else {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x - anchor.x,
                        y: manimCoord.y - anchor.y
                    };
                }
                render();
                return;
            }
            
            if (!clickedElement && selectionCount > 0) {
                clearSelection();
                render();
                return;
            }
            
            const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
            const drawMode = plugin?.drawMode || 'drag';
            if (drawMode === 'multiClick' || drawMode === 'click') {
                handleClickDrawing(canvasX, canvasY);
            } else {
                startDrawing(canvasX, canvasY);
            }
            return;
        }
        
        if (clickedElement) {
            if (isMetaKey) {
                toggleElementSelection(clickedElement);
                return;
            }
            
            if (isShiftKey && !ManimEditor.isElementSelected(clickedElement.id)) {
                addElementToSelection(clickedElement);
                return;
            }
            
            if (!ManimEditor.isElementSelected(clickedElement.id)) {
                selectSingleElement(clickedElement);
            }
            
            if (getSelectionCount() > 1) {
                isDragging = true;
                dragMode = 'move-multi';
                dragSelection = {
                    ids: [...ManimEditor.selectedElementIds],
                    lastPoint: manimCoord,
                    hasMoved: false
                };
            } else {
                dragElement = getPrimarySelectedElement() || clickedElement;
                isDragging = true;
                dragMode = 'move-single';
                
                const plugin = ManimEditor.shapeRegistry[dragElement.type];
                const anchor = plugin && plugin.getMoveAnchor ? plugin.getMoveAnchor(dragElement) : null;
                if (anchor === null) {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x,
                        y: manimCoord.y,
                        lastX: 0,
                        lastY: 0
                    };
                } else {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x - anchor.x,
                        y: manimCoord.y - anchor.y
                    };
                }
            }
            
            render();
            return;
        }
        
        if (!additive && selectionCount > 0) {
            clearSelection();
        }
        
        isMarqueeSelecting = true;
        marqueeStart = { x: canvasX, y: canvasY };
        marqueeAdditive = additive;
        ManimEditor.marqueeRect = null;
        ManimEditor.marqueePreviewIds = [];
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (window.debugScale && dragMode === 'scale-handle') {
            window.debugScale.log('mouseup', {});
        }
        
        if (isDragging && dragChanged) {
            saveToHistory();
        }
        
        dragElement = null;
        dragMode = null;
        dragSelection = null;
        dragOffset = { x: 0, y: 0 };
        isDragging = false;
        dragChanged = false;
        
        if (isMarqueeSelecting) {
            const rectInfo = ManimEditor.marqueeRect;
            const hasArea = rectInfo && (rectInfo.w >= 6 || rectInfo.h >= 6);
            let ids = hasArea ? collectElementsInRect(rectInfo) : [];
            
            if (marqueeAdditive) {
                const combined = new Set(ManimEditor.selectedElementIds);
                ids.forEach(id => combined.add(id));
                setSelectionByIds(Array.from(combined), { skipRender: true });
            } else {
                setSelectionByIds(ids, { skipRender: true });
            }
            
            isMarqueeSelecting = false;
            marqueeStart = null;
            marqueeAdditive = false;
            ManimEditor.marqueeRect = null;
            ManimEditor.marqueePreviewIds = [];
            render();
        }
        
        if (ManimEditor.isDrawing) {
            const rectBound = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rectBound.left;
            const canvasY = e.clientY - rectBound.top;
            finishDrawing(canvasX, canvasY);
        }
    });
    
    canvas.addEventListener('dblclick', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        if (ManimEditor.mode === 'draw' && ManimEditor.drawingState) {
            finishClickDrawing();
            return;
        }
        
        const element = findElementAtPoint(canvasX, canvasY);
        if (element) {
            selectSingleElement(element);
            render();
        }
    });
}

/**
 * 查找点击位置的控制点
 */
function findControlPoint(canvasX, canvasY, element) {
    const outerSize = 16; // 向外侧扩展（像素）
    const innerSize = 8;  // 向内侧扩展（像素）
    
    // 插件化：检查插件自定义的控制点
    const plugin = ManimEditor.shapeRegistry[element.type];
    if (plugin && plugin.getControlPoints) {
        const controlPoints = plugin.getControlPoints(element, ManimEditor);
        
        if (controlPoints && controlPoints.length > 0) {
            const threshold = 12;
            
            for (let i = 0; i < controlPoints.length; i++) {
                const point = controlPoints[i];
                const canvasPoint = ManimEditor.manimToCanvas(point.x, point.y);
                const distance = Math.sqrt(
                    Math.pow(canvasX - canvasPoint.x, 2) +
                    Math.pow(canvasY - canvasPoint.y, 2)
                );
                
                if (distance <= threshold) {
                    console.log(`检测到控制点: ${point.id}, 距离=${distance.toFixed(1)}px`);
                    return { type: 'curvePoint', index: i };
                }
            }
        }
    }
    
    // 检查缩放手柄（所有图形都支持，包括曲线）
    const bounds = getElementBounds(element);
    if (bounds) {
        const handles = [
            { x: bounds.x, y: bounds.y, corner: 'topLeft' },
            { x: bounds.x + bounds.w, y: bounds.y, corner: 'topRight' },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h, corner: 'bottomRight' },
            { x: bounds.x, y: bounds.y + bounds.h, corner: 'bottomLeft' }
        ];
        
        // 使用矩形区域检测，向外侧扩展更多
        for (let handle of handles) {
                let minX, maxX, minY, maxY;
                
                // 根据角的位置，向外侧扩展更多，向内侧扩展较少
                if (handle.corner === 'topLeft') {
                    // 左上：向左和向上扩展多，向右和向下扩展少
                    minX = handle.x - outerSize;  // 向左（外）
                    maxX = handle.x + innerSize;  // 向右（内）
                    minY = handle.y - outerSize;  // 向上（外）
                    maxY = handle.y + innerSize;  // 向下（内）
                } else if (handle.corner === 'topRight') {
                    // 右上：向右和向上扩展多，向左和向下扩展少
                    minX = handle.x - innerSize;  // 向左（内）
                    maxX = handle.x + outerSize;  // 向右（外）
                    minY = handle.y - outerSize;  // 向上（外）
                    maxY = handle.y + innerSize;  // 向下（内）
                } else if (handle.corner === 'bottomRight') {
                    // 右下：向右和向下扩展多，向左和向上扩展少
                    minX = handle.x - innerSize;  // 向左（内）
                    maxX = handle.x + outerSize;  // 向右（外）
                    minY = handle.y - innerSize;  // 向上（内）
                    maxY = handle.y + outerSize;  // 向下（外）
                } else { // bottomLeft
                    // 左下：向左和向下扩展多，向右和向上扩展少
                    minX = handle.x - outerSize;  // 向左（外）
                    maxX = handle.x + innerSize;  // 向右（内）
                    minY = handle.y - innerSize;  // 向上（内）
                    maxY = handle.y + outerSize;  // 向下（外）
                }
                
            // 检查鼠标是否在响应区域内
            if (canvasX >= minX && canvasX <= maxX && 
                canvasY >= minY && canvasY <= maxY) {
                console.log(`检测到缩放手柄: ${handle.corner}, 鼠标=(${canvasX.toFixed(0)}, ${canvasY.toFixed(0)}), 手柄=(${handle.x.toFixed(0)}, ${handle.y.toFixed(0)})`);
                return { type: 'scaleHandle', corner: handle.corner };
            }
        }
    }
    
    return null;
}

/**
 * 获取元素的边界框（画布坐标）- 调用插件方法
 */
function getElementBounds(element) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (plugin && plugin.getBounds) {
        return plugin.getBounds(element, ManimEditor);
    }
    
    // 如果插件未实现getBounds，返回null
    console.warn(`插件 ${element.type} 未实现 getBounds 方法`);
    return null;
}

/**
 * 处理缩放拖拽 - 调用插件方法（插件化v2.0）
 * @param {boolean} skipHistory - 是否跳过历史记录（拖动中使用）
 */
function handleScaleDrag(element, dragOffset, currentCoord, skipHistory = false) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (!plugin) {
        console.error(`未找到插件: ${element.type}`);
        return;
    }
    
    const corner = dragOffset.corner;
    const isShift = window.isShiftPressed || false;
    
    // 准备缩放信息（fixedPoint已在mousedown时缓存）
    const scaleInfo = {
        corner: corner,
        fixedPoint: dragOffset.fixedPoint,  // 使用mousedown时缓存的固定点
        currentPoint: currentCoord,
        isShift: window.isShiftPressed || false,
        originalProps: dragOffset.originalProps
    };
    
    // 调试日志
    if (window.debugScale) {
        window.debugScale.log('mousemove', { 
            fixedPoint: scaleInfo.fixedPoint, 
            currentPoint: scaleInfo.currentPoint 
        });
    }
    
    // 调用插件的缩放处理
    if (plugin.handleScale) {
        const newProps = plugin.handleScale(element, scaleInfo, ManimEditor);
        updateElement(element.id, newProps, skipHistory);  // 传递 skipHistory
    } else {
        console.warn(`插件 ${element.type} 未实现 handleScale 方法`);
    }
}

/**
 * 计算固定点（对角点）- 使用原始props
 */
function calculateFixedPoint(element, corner, originalProps) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (!plugin || !plugin.getBounds) {
        console.error(`插件 ${element.type} 未实现 getBounds，无法计算固定点`);
        return { x: 0, y: 0 };
    }
    
    // 关键：使用originalProps创建临时元素来计算bounds
    const tempElement = {
        type: element.type,
        id: element.id,
        name: element.name,
        props: originalProps  // 使用原始props，不是当前props！
    };
    
    console.log(`[calculateFixedPoint] corner=${corner}, originalProps=`, originalProps);
    
    // 使用原始状态的bounds计算固定点
    const bounds = plugin.getBounds(tempElement, ManimEditor);
    if (!bounds) {
        console.error(`getBounds返回null`);
        return { x: 0, y: 0 };
    }
    
    console.log(`[calculateFixedPoint] bounds=`, bounds);
    
    // 从Canvas bounds的四个角计算对应的Manim固定点
    // 注意：拖动某个角时，固定的是对角
    const allCorners = {
        topLeft: ManimEditor.canvasToManim(bounds.x, bounds.y),
        topRight: ManimEditor.canvasToManim(bounds.x + bounds.w, bounds.y),
        bottomLeft: ManimEditor.canvasToManim(bounds.x, bounds.y + bounds.h),
        bottomRight: ManimEditor.canvasToManim(bounds.x + bounds.w, bounds.y + bounds.h)
    };
    
    console.log(`[calculateFixedPoint] 所有角(Manim坐标)=`, allCorners);
    
    // 对角映射
    const fixedCorners = {
        // 拖动左上 → 固定右下
        'topLeft': allCorners.bottomRight,
        // 拖动右上 → 固定左下
        'topRight': allCorners.bottomLeft,
        // 拖动右下 → 固定左上
        'bottomRight': allCorners.topLeft,
        // 拖动左下 → 固定右上
        'bottomLeft': allCorners.topRight
    };
    
    const result = fixedCorners[corner] || { x: 0, y: 0 };
    console.log(`[calculateFixedPoint] 拖动${corner} → 固定点=`, result);
    
    return result;
}

/**
 * 处理点击式绘制（通用）
 */
function handleClickDrawing(canvasX, canvasY) {
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (!plugin || !plugin.onDrawClick) {
        console.error('插件未实现onDrawClick');
        return;
    }
    
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    const point = [manimCoord.x, manimCoord.y, 0];
    
    // 第一次点击
    if (!ManimEditor.drawingState) {
        clearSelection({ skipRender: true });
    }
    
    // 调用插件处理点击
    const result = plugin.onDrawClick(ManimEditor.drawingState, point, ManimEditor);
    
    if (result.continue) {
        // 继续绘制
        ManimEditor.drawingState = result.state;
    } else if (result.element) {
        // 完成绘制
        const newElement = addElement(result.element);
        
        // 立即选中刚创建的元素，并显示属性面板（保持绘制模式）
        selectSingleElement(newElement, { skipRender: true });
        
        ManimEditor.drawingState = null;
        ManimEditor.previewPoint = null;
        // 注意：不调用 setSelectMode()，保持在绘制模式
        // 也不移除工具按钮的 active 状态
    }
    
    render();
}

/**
 * 完成点击式绘制（双击）
 */
function finishClickDrawing() {
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (!plugin || !plugin.onDrawDoubleClick) return;
    
    // 调用插件处理双击
    const element = plugin.onDrawDoubleClick(ManimEditor.drawingState, ManimEditor);
    
    if (element) {
        const newElement = addElement(element);
        
        // 立即选中刚创建的元素，并显示属性面板（保持绘制模式）
        selectSingleElement(newElement, { skipRender: true });
        
        ManimEditor.drawingState = null;
        ManimEditor.previewPoint = null;
        // 注意：不调用 setSelectMode()，保持在绘制模式
        // 也不移除工具按钮的 active 状态
        
        render();
    }
}

/**
 * 开始绘制
 */
function startDrawing(canvasX, canvasY) {
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    
    // 清除当前选中的图形，开始绘制新图形
    clearSelection({ skipRender: true });
    
    ManimEditor.isDrawing = true;
    ManimEditor.drawStart = { x: canvasX, y: canvasY, manimX: manimCoord.x, manimY: manimCoord.y };
    
    // 创建临时元素
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (plugin && plugin.createDefault) {
        ManimEditor.tempElement = plugin.createDefault(manimCoord.x, manimCoord.y);
    }
    
    render();
}

/**
 * 更新临时元素 - 调用插件方法（插件化v2.0）
 */
function updateTempElement(canvasX, canvasY) {
    if (!ManimEditor.tempElement || !ManimEditor.drawStart) return;
    
    const plugin = ManimEditor.shapeRegistry[ManimEditor.tempElement.type];
    
    if (!plugin) {
        console.error(`未找到插件: ${ManimEditor.tempElement.type}`);
        return;
    }
    
    // 准备坐标信息
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    const startCoord = ManimEditor.drawStart;
    const currentCoord = {
        canvasX: canvasX,
        canvasY: canvasY,
        manimX: manimCoord.x,
        manimY: manimCoord.y,
        isShift: window.isShiftPressed || false
    };
    
    // 调用插件的拖动更新方法
    if (plugin.updateWhileDrawing) {
        console.log(`[绘制] 调用 ${ManimEditor.tempElement.type}.updateWhileDrawing`);
        plugin.updateWhileDrawing(ManimEditor.tempElement, startCoord, currentCoord, ManimEditor);
    } else {
        console.warn(`[绘制] 插件 ${ManimEditor.tempElement.type} 未实现 updateWhileDrawing`);
    }
    
    render();
}

/**
 * 完成绘制
 */
function finishDrawing(canvasX, canvasY) {
    if (!ManimEditor.tempElement) {
        ManimEditor.isDrawing = false;
        return;
    }
    
    const startCoord = ManimEditor.drawStart;
    const rect = document.getElementById('main-canvas').getBoundingClientRect();
    const distance = Math.sqrt(
        Math.pow(canvasX - startCoord.x, 2) + 
        Math.pow(canvasY - startCoord.y, 2)
    );
    
    // 如果拖动距离太小（小于10像素），不创建元素
    if (distance < 10) {
        console.log('拖动距离太小，取消创建');
        ManimEditor.tempElement = null;
        ManimEditor.isDrawing = false;
        ManimEditor.drawStart = null;
        render();
        return;
    }
    
    updateTempElement(canvasX, canvasY);
    
    // 添加元素到场景
    const newElement = addElement(ManimEditor.tempElement);
    
    // 立即选中刚创建的元素，并显示属性面板（保持绘制模式）
    selectSingleElement(newElement, { skipRender: true });
    
    // 清理临时状态
    ManimEditor.tempElement = null;
    ManimEditor.isDrawing = false;
    ManimEditor.drawStart = null;
    
    render();
}

/**
 * 初始化属性面板
 */
function initPropertyPanel() {
    const closeBtn = document.getElementById('close-panel-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hidePropertyPanel);
    }
    
    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hidePropertyPanel();
        }
    });

    // 拖动属性面板（拖拽区域：面板头部）
    const panel = document.getElementById('property-panel');
    const header = panel ? panel.querySelector('.panel-header') : null;
    if (panel && header) {
        let isDraggingPanel = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        header.style.cursor = 'move';
        header.addEventListener('mousedown', (e) => {
            isDraggingPanel = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            // 从右侧停靠切换为绝对定位
            panel.style.right = 'auto';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingPanel) return;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const panelRect = panel.getBoundingClientRect();
            let left = e.clientX - dragOffsetX;
            let top = e.clientY - dragOffsetY;
            // 约束在视口内
            left = Math.max(0, Math.min(left, viewportW - panelRect.width));
            top = Math.max(0, Math.min(top, viewportH - 40));
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDraggingPanel) return;
            isDraggingPanel = false;
            document.body.style.userSelect = '';
        });
    }
}

/**
 * 显示属性面板
 */
function showPropertyPanel(element) {
    const panel = document.getElementById('property-panel');
    const content = document.getElementById('property-content');

    panel.classList.remove('hidden');
    
    // 生成属性表单
    content.innerHTML = '';
    
    const plugin = ManimEditor.shapeRegistry[element.type];
    if (!plugin) return;
    
    // 通用属性
    addPropertyField(content, element, 'name', '名称', 'text');
    
    // 形状特定属性
    if (plugin.properties && plugin.properties.length > 0) {
        plugin.properties.forEach(prop => {
            // 传入完整的属性定义对象，便于读取 step/min/max/options
            addPropertyField(content, element, prop.key, prop.label, prop.type, prop);
        });
    } else {
        // 默认属性
        Object.keys(element.props).forEach(key => {
            if (key !== 'hidden') {
                const type = typeof element.props[key] === 'number' ? 'number' : 'text';
                addPropertyField(content, element, key, key, type);
            }
        });
    }
    
    // 隐藏选项
    addPropertyField(content, element, 'hidden', '隐藏（不导出）', 'checkbox');
    
    // 自动focus到默认字段
    if (plugin.defaultFocusField) {
        // 使用 setTimeout 确保DOM已经渲染
        setTimeout(() => {
            const targetInput = content.querySelector(`input[data-prop-key="${plugin.defaultFocusField}"]`);
            if (targetInput) {
                targetInput.focus();
                // 如果是文本框，选中全部内容
                if (targetInput.type === 'text' || targetInput.tagName === 'TEXTAREA') {
                    targetInput.select();
                }
            }
        }, 0);
    }
}

/**
 * 添加属性字段
 */
function addPropertyField(container, element, key, label, type, options) {
    const group = document.createElement('div');
    group.className = 'property-group';
    
    const labelElem = document.createElement('label');
    labelElem.textContent = label;
    group.appendChild(labelElem);
    
    let input;
    
    if (type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        const value = key === 'hidden' ? element.props.hidden : element[key];
        input.checked = !!value;
    } else if (type === 'select' && options) {
        input = document.createElement('select');
        const optList = Array.isArray(options) ? options : (options.options || []);
        optList.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            input.appendChild(option);
        });
        const value = key in element.props ? element.props[key] : element[key];
        input.value = value;
    } else if (type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        const value = key in element.props ? element.props[key] : element[key];
        input.value = value || '#3498db';
    } else {
        input = document.createElement('input');
        input.type = type || 'text';
        
        // 处理数组属性
        let value;
        if (key.includes('[')) {
            const match = key.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const arrayKey = match[1];
                const index = parseInt(match[2]);
                value = element.props[arrayKey] ? element.props[arrayKey][index] : 0;
            }
        } else {
            value = key in element.props ? element.props[key] : element[key];
        }
        
        // 关键改进：对浮点数四舍五入到2位小数
        if (type === 'number' && typeof value === 'number') {
            value = Math.round(value * 100) / 100;  // 保留2位小数
        }
        
        input.value = value !== undefined ? value : '';
        
        if (type === 'number') {
            // 使用属性定义中的 step 值，如果没有则默认 0.01
            input.step = options?.step !== undefined ? options.step : '0.01';
            
            // 设置 min 和 max（如果有）
            if (options?.min !== undefined) {
                input.min = options.min;
            }
            if (options?.max !== undefined) {
                input.max = options.max;
            }
        }
    }
    
    // 添加 data 属性用于识别字段
    input.setAttribute('data-prop-key', key);
    
    // 判断是否需要跳过历史记录（仅 label 的 text 属性）
    const isLabelText = element.type === 'label' && key === 'text';
    let labelTextInitialValue = null;
    
    if (isLabelText) {
        // 记录初始值
        labelTextInitialValue = input.value;
    }
    
    // 监听变化
    input.addEventListener('input', (e) => {
        let value = e.target.value;
        
        if (type === 'number') {
            // 如果输入为空或无效，不更新
            if (value === '' || value === '-' || value === '.') {
                return; // 允许临时输入状态，不立即更新
            }
            value = parseFloat(value);
            if (isNaN(value)) {
                return; // 无效数字，不更新
            }
        } else if (type === 'checkbox') {
            value = e.target.checked;
        }
        
        if (key === 'name') {
            element.name = value;
            render();
        } else if (key === 'hidden') {
            element.props.hidden = value;
            render();
        } else if (key.includes('[')) {
            // 处理数组属性，例如 start[0], start[1]
            const match = key.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const arrayKey = match[1];
                const index = parseInt(match[2]);
                if (!element.props[arrayKey]) {
                    element.props[arrayKey] = [];
                }
                element.props[arrayKey][index] = value;
            }
            render();
        } else {
            // 使用 updateElement() 而不是直接修改（触发智能更新）
            const newProps = { [key]: value };
            // label 的 text 属性输入时跳过历史
            updateElement(element.id, newProps, isLabelText);
        }
    });
    
    // 失去焦点时，为 label 的 text 保存历史
    if (isLabelText) {
        input.addEventListener('blur', (e) => {
            const currentValue = e.target.value;
            // 只有值真正改变了才保存历史
            if (currentValue !== labelTextInitialValue) {
                saveToHistory();
                labelTextInitialValue = currentValue;  // 更新初始值
            }
        });
    }
    
    group.appendChild(input);
    container.appendChild(group);
}

/**
 * 更新属性面板
 */
function updatePropertyPanel(element) {
    if (ManimEditor.selectedElement?.id === element.id) {
        showPropertyPanel(element);
    }
}

/**
 * 隐藏属性面板
 */
function hidePropertyPanel(options = {}) {
    const { preserveSelection = false } = options;
    const panel = document.getElementById('property-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    // 关闭时清除拖拽产生的定位，确保下次打开回到默认位置
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    if (!preserveSelection) {
        ManimEditor.clearSelection();
        hideMultiSelectionIndicator();
        render();
    }
}

/**
 * 初始化键盘快捷键
 */
function initKeyboardShortcuts() {
    // 监听Shift键状态（全局）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            window.isShiftPressed = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            window.isShiftPressed = false;
        }
    });
    
    document.addEventListener('keydown', (e) => {
        // 检查焦点是否在输入框中
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );
        const selectionCount = getSelectionCount();
        
        // Ctrl/Cmd + Z: 撤销
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        
        // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y: 重做
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redo();
        }
        
        // Ctrl/Cmd + C: 复制选中元素
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            if (!isInputFocused && selectionCount > 0) {
                e.preventDefault();
                copySelectionToClipboard();
            }
        }
        
        // Ctrl/Cmd + V: 粘贴
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            if (!isInputFocused && ManimEditor.clipboard && ManimEditor.clipboard.length > 0) {
                e.preventDefault();
                pasteFromClipboard();
            }
        }
        
        // Ctrl/Cmd + A: 全选元素
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            if (!isInputFocused) {
                e.preventDefault();
                if (ManimEditor.mode !== 'select') {
                    setSelectMode();
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                }
                const allIds = ManimEditor.elements.map(element => element.id);
                if (allIds.length > 0) {
                    setSelectionByIds(allIds);
                }
            }
        }
        
        // Delete: 删除选中元素（但不在输入框中时）
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!isInputFocused && selectionCount > 0) {
                e.preventDefault();
                deleteSelectedElement();
            }
        }

        // 方向键：移动选中元素
        if (!isInputFocused && selectionCount > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const pxPerUnit = ManimEditor.pxPerUnit || 70;
            const stepPx = e.shiftKey ? 10 : 1;
            const stepUnits = stepPx / pxPerUnit;
            let deltaX = 0;
            let deltaY = 0;
            switch (e.key) {
                case 'ArrowUp':
                    deltaY = stepUnits;
                    break;
                case 'ArrowDown':
                    deltaY = -stepUnits;
                    break;
                case 'ArrowLeft':
                    deltaX = -stepUnits;
                    break;
                case 'ArrowRight':
                    deltaX = stepUnits;
                    break;
            }
            applyMoveDeltaToSelection(deltaX, deltaY, { skipHistory: true });
            saveToHistory();
            if (selectionCount === 1) {
                const element = getPrimarySelectedElement();
                if (element) {
                    updatePropertyPanel(element);
                }
            }
        }
        
        // Escape: 取消选择/关闭面板/退出绘制模式/关闭导出弹窗（即使在输入框中也响应）
        if (e.key === 'Escape') {
            // 如果在输入框中，先失焦
            if (isInputFocused) {
                activeElement.blur();
            }
            if (ManimEditor.mode !== 'select') {
                setSelectMode();
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            }
            clearSelection();
            ManimEditor.marqueeRect = null;
            ManimEditor.marqueePreviewIds = [];
            // 关闭导出弹窗
            const exportModal = document.getElementById('export-modal');
            if (exportModal && !exportModal.classList.contains('hidden')) {
                hideExportModal();
            }
        }
    });
}

/**
 * 初始化工具栏按钮
 */
function initToolbarButtons() {
    // 撤销/重做
    document.getElementById('undo-btn')?.addEventListener('click', undo);
    document.getElementById('redo-btn')?.addEventListener('click', redo);
    
    // 删除
    document.getElementById('delete-btn')?.addEventListener('click', deleteSelectedElement);
    
    // 清空（不需要确认）
    document.getElementById('clear-btn')?.addEventListener('click', () => {
        ManimEditor.elements = [];
        clearSelection({ skipRender: true });
        saveToHistory();
        render();
    });
    
    // 导出Manim代码
    document.getElementById('export-btn')?.addEventListener('click', showExportModal);
    
    // 导出JSON
    document.getElementById('export-json-btn')?.addEventListener('click', exportJSONFile);
    
    // 导入JSON
    document.getElementById('import-json-btn')?.addEventListener('click', importJSONFile);
    
    // 关闭模态框
    document.getElementById('close-modal-btn')?.addEventListener('click', hideExportModal);
    document.getElementById('export-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'export-modal') {
            hideExportModal();
        }
    });
    
    // 复制代码
    document.getElementById('copy-code-btn')?.addEventListener('click', copyCode);
    
    // 下载代码
    document.getElementById('download-code-btn')?.addEventListener('click', downloadCode);
}

/**
 * 删除选中的元素
 */
function deleteSelectedElement() {
    const ids = [...ManimEditor.selectedElementIds];
    if (ids.length === 0) return;
    
    ManimEditor.elements = ManimEditor.elements.filter(element => !ids.includes(element.id));
    clearSelection({ skipRender: true });
    updateElementsOrder();
    saveToHistory();
    render();
}

/**
 * 显示导出模态框
 */
function showExportModal() {
    const modal = document.getElementById('export-modal');
    const codeDisplay = document.getElementById('export-code-display');
    
    const code = generateManimCode();
    codeDisplay.textContent = code;
    
    modal.classList.remove('hidden');
}

/**
 * 隐藏导出模态框
 */
function hideExportModal() {
    document.getElementById('export-modal')?.classList.add('hidden');
}

/**
 * 复制代码
 */
function copyCode() {
    const codeDisplay = document.getElementById('export-code-display');
    const code = codeDisplay.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ 已复制';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('复制失败，请手动复制');
    });
}

/**
 * 下载代码
 */
function downloadCode() {
    const code = generateManimCode();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_scene.py';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导出JSON文件
 */
function exportJSONFile() {
    const data = exportToJSON();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manim_scene.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导入JSON文件
 */
function importJSONFile() {
    const fileInput = document.getElementById('file-input');
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                if (importFromJSON(jsonData)) {
                    alert('导入成功！');
                }
            } catch (err) {
                console.error('Failed to import:', err);
                alert('导入失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
        
        // 重置文件输入
        fileInput.value = '';
    };
    
    fileInput.click();
}

