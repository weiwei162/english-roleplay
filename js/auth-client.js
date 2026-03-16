/**
 * 用户认证客户端
 * 处理登录、注册、Token 管理
 */

class AuthClient {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = null;
        
        // 如果已有 token，验证是否有效
        if (this.token) {
            this.verifyToken();
        }
    }
    
    /**
     * 用户注册
     */
    async register(username, password, parentEmail = '') {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, parentEmail })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', this.token);
                console.log('✅ Registered:', username);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Register error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 用户登录
     */
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', this.token);
                console.log('✅ Logged in:', username);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 验证 Token
     */
    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.token })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.user = data.user;
                return true;
            } else {
                this.logout();
                return false;
            }
            
        } catch (error) {
            console.error('❌ Verify token error:', error);
            return false;
        }
    }
    
    /**
     * 登出
     */
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        console.log('👋 Logged out');
    }
    
    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!this.token && !!this.user;
    }
    
    /**
     * 获取用户名
     */
    getUsername() {
        return this.user ? this.user.username : 'Anonymous';
    }
}

// 创建全局实例
window.authClient = new AuthClient();

/**
 * 显示登录界面
 */
function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.classList.add('active');
    }
}

/**
 * 隐藏登录界面
 */
function hideLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.classList.remove('active');
    }
}

/**
 * 切换登录/注册表单
 */
function toggleAuthForm(formType) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const formTitle = document.getElementById('form-title');
    
    if (formType === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        formTitle.textContent = '📝 创建账号';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        formTitle.textContent = '👋 欢迎回来';
    }
}

/**
 * 处理登录
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    const result = await window.authClient.login(username, password);
    
    if (result.success) {
        hideLoginScreen();
        updateAuthUI();
        alert(`欢迎回来，${username}！`);
    } else {
        alert(result.error || '登录失败，请重试');
    }
}

/**
 * 处理注册
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const parentEmail = document.getElementById('register-email').value.trim();
    
    if (!username || !password) {
        alert('请填写用户名和密码');
        return;
    }
    
    if (username.length < 3) {
        alert('用户名至少 3 个字符');
        return;
    }
    
    if (password.length < 4) {
        alert('密码至少 4 个字符');
        return;
    }
    
    const result = await window.authClient.register(username, password, parentEmail);
    
    if (result.success) {
        hideLoginScreen();
        updateAuthUI();
        alert(`注册成功！欢迎加入，${username}！`);
    } else {
        alert(result.error || '注册失败，请重试');
    }
}

/**
 * 处理登出
 */
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        window.authClient.logout();
        updateAuthUI();
        showLoginScreen();
    }
}

/**
 * 更新认证 UI
 */
function updateAuthUI() {
    const authStatus = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');
    
    if (!authStatus || !loginBtn) return;
    
    if (window.authClient.isLoggedIn()) {
        authStatus.textContent = `👤 ${window.authClient.getUsername()}`;
        authStatus.className = 'auth-status logged-in';
        loginBtn.textContent = '退出登录';
        loginBtn.onclick = handleLogout;
    } else {
        authStatus.textContent = '未登录';
        authStatus.className = 'auth-status';
        loginBtn.textContent = '登录/注册';
        loginBtn.onclick = showLoginScreen;
    }
}

// 页面加载时更新 UI
document.addEventListener('DOMContentLoaded', function() {
    updateAuthUI();
});
