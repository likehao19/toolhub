//! JavaScript 注入脚本

/// 链接拦截脚本
///
/// 用于在子窗口中拦截所有链接点击，
/// 阻止 Tauri 默认的 shell.open 行为，
/// 改为在窗口内导航
pub const LINK_INTERCEPTION_SCRIPT: &str = r#"
(function() {
    'use strict';

    /**
     * 拦截链接点击事件处理器
     * @param {Event} e - 点击事件
     */
    function interceptLinks(e) {
        // 查找被点击的链接元素
        let target = e.target;
        while (target && target.tagName !== 'A') {
            target = target.parentElement;
        }

        // 如果找到链接元素且有 href 属性
        if (target && target.tagName === 'A' && target.href) {
            // 阻止默认行为和事件传播
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // 在当前窗口导航
            window.location.href = target.href;
        }
    }

    /**
     * 设置链接拦截
     */
    function setupInterception() {
        // 使用捕获阶段确保在其他处理程序之前执行
        document.addEventListener('click', interceptLinks, true);
    }

    // 根据文档加载状态决定何时设置拦截
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupInterception);
    } else {
        setupInterception();
    }
})();
"#;
