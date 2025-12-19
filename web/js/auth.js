/**
 * 前端认证逻辑
 */

const Auth = {
    TOKEN_KEY: 'secondme_token',
    USER_KEY: 'secondme_user',

    /**
     * 获取存储的 Token
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * 获取当前用户信息
     */
    getUser() {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * 检查是否是管理员
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    /**
     * 保存登录信息
     */
    saveLogin(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    /**
     * 清除登录信息
     */
    clearLogin() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },

    /**
     * 退出登录
     */
    logout() {
        this.clearLogin();
        window.location.href = '/login.html';
    },

    /**
     * 检查认证状态，未登录则跳转到登录页
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },

    /**
     * 获取 Authorization Header
     */
    getAuthHeader() {
        const token = this.getToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }
};
