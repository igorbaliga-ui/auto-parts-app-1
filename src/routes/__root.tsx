import type {ReactNode} from "react";
import {useEffect} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import AppBackground from "@/components/site/AppBackground";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppSplash from "@/components/AppSplash";
import NotFound from "@/pages/NotFound";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import appCss from "@/index.css?url";

const TITLE = "ЗАП ОПТОМ — проверенные запчасти по выгодным ценам";
const DESCRIPTION = "Стол заказа запчастей ЗАП ОПТОМ. Проверенные запчасти по выгодным ценам.";
const OG_DESCRIPTION = "Подбор запчастей по VIN. Проверенные запчасти по выгодным ценам, кешбэк 3%.";
const OG_IMAGE = "https://zapoptom.ru/og-image.jpg";
const FONTS_URL =
    "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Rubik:wght@400;500;600&display=optional";

// Стили заставки при холодном старте (самодостаточные, без Tailwind) и тёмный фон html,
// чтобы первый кадр никогда не был белым.
const SPLASH_CSS = `html {
    background: #0e0e0f;
}
#app-splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: radial-gradient(120% 90% at 50% 38%, #1a1b1d 0%, #0e0e0f 72%);
    transition: opacity .45s ease, visibility .45s ease;
}
#app-splash.app-splash--hide {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}
.app-splash__title {
    margin: 0;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: clamp(1.9rem, 8.5vw, 3rem);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-align: center;
    color: #3a3b3f;
    text-shadow:
        -1.5px -1.5px 1.5px rgba(0, 0, 0, 0.85),
        1.5px 1.5px 1.5px rgba(255, 255, 255, 0.07),
        0 0 16px rgba(229, 67, 42, 0.3);
    animation: app-splash-glow 2.4s ease-in-out infinite;
}
.app-splash__subtitle {
    display: block;
    margin-top: 12px;
    font-family: 'Rubik', sans-serif;
    font-weight: 500;
    font-size: clamp(0.7rem, 2.6vw, 0.85rem);
    letter-spacing: 0.34em;
    text-transform: uppercase;
    text-align: center;
    color: #8c8a83;
}
.app-splash__loader {
    margin-top: 34px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 3px solid rgba(229, 67, 42, 0.18);
    border-top-color: #e5432a;
    animation: app-splash-spin 0.85s linear infinite;
}
@keyframes app-splash-glow {
    0%, 100% {
        text-shadow:
            -1.5px -1.5px 1.5px rgba(0, 0, 0, 0.85),
            1.5px 1.5px 1.5px rgba(255, 255, 255, 0.07),
            0 0 10px rgba(229, 67, 42, 0.22);
    }
    50% {
        text-shadow:
            -1.5px -1.5px 1.5px rgba(0, 0, 0, 0.85),
            1.5px 1.5px 1.5px rgba(255, 255, 255, 0.07),
            0 0 30px rgba(229, 67, 42, 0.62);
    }
}
@keyframes app-splash-spin {
    to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
    .app-splash__title,
    .app-splash__loader {
        animation: none;
    }
}`;

// Выполняется синхронно в <head>, до загрузки React:
// - ловит раннее 'beforeinstallprompt' (подхватывается в usePwaInstall);
// - на /admin подменяет манифест и apple-mobile-web-app-title (важно для iOS «На экран Домой»);
// - при повторном визите сразу прячет заставку;
// - подключает шрифт, не блокируя первую отрисовку (media=print -> all после загрузки).
const EARLY_HEAD_SCRIPT = `
window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__deferredPwaPrompt = e;
});
if (location.pathname.indexOf('/admin') === 0) {
    var m = document.querySelector('link[rel="manifest"]');
    if (m) m.setAttribute('href', '/admin-manifest.webmanifest');
    var t = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (t) t.setAttribute('content', 'ЗАП ОПТОМ');
}
var splashSeen = false;
try { splashSeen = !!localStorage.getItem('app_splash_seen'); } catch (e) {}
if (splashSeen) {
    var s = document.createElement('style');
    s.textContent = '#app-splash{display:none}';
    document.head.appendChild(s);
}
var f = document.createElement('link');
f.rel = 'stylesheet';
f.href = '${FONTS_URL}';
f.media = 'print';
f.onload = function () { this.media = 'all'; };
document.head.appendChild(f);
`;

const METRIKA_SCRIPT = `
(function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () {
        (m[i].a = m[i].a || []).push(arguments)
    };
    m[i].l = 1 * new Date();
    for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) {
            return;
        }
    }
    k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

ym(101026698, "init", {
    trustedDomains: ["poehali.dev"],
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    trackHash: true
});
`;

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {
                name: "viewport",
                content:
                    "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
            },
            {title: TITLE},
            {name: "description", content: DESCRIPTION},
            {name: "author", content: "ЗАП ОПТОМ"},
            {name: "theme-color", content: "#0e0e0f"},
            {name: "apple-mobile-web-app-capable", content: "yes"},
            {name: "apple-mobile-web-app-status-bar-style", content: "black-translucent"},
            {name: "apple-mobile-web-app-title", content: "ЗАП ОПТОМ"},
            {property: "og:title", content: TITLE},
            {property: "og:description", content: OG_DESCRIPTION},
            {property: "og:image:width", content: "2050"},
            {property: "og:image:height", content: "1080"},
            {property: "og:image", content: OG_IMAGE},
            {name: "twitter:card", content: "summary_large_image"},
            {name: "twitter:image", content: OG_IMAGE},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "stylesheet", href: appCss},
            {rel: "icon", type: "image/svg+xml", href: "/favicon.svg"},
            {rel: "manifest", href: "/manifest.webmanifest"},
            {rel: "apple-touch-icon", href: "/apple-touch-icon.png"},
            {rel: "preconnect", href: "https://fonts.googleapis.com"},
            {rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous"},
            {rel: "preconnect", href: "https://cdn.poehali.dev", crossOrigin: "anonymous"},
            {rel: "preload", as: "style", href: FONTS_URL},
        ],
        styles: [{children: SPLASH_CSS}],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            {children: EARLY_HEAD_SCRIPT},
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
            {children: METRIKA_SCRIPT},
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFound,
});

function useBrowserSetup() {
    useEffect(() => {
        // Service worker (PWA)
        const registerSw = () => {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
        };
        if ("serviceWorker" in navigator) {
            if (document.readyState === "complete") registerSw();
            else window.addEventListener("load", registerSw, {once: true});
        }

        // Дополнительная блокировка pinch-zoom и двойного тапа-зума: в установленном
        // standalone-приложении на телефоне viewport-мета не всегда полностью
        // предотвращает жестовое масштабирование, особенно после обновления страницы.
        let lastTouchEnd = 0;
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) e.preventDefault();
        };
        const onTouchEnd = (e: TouchEvent) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) e.preventDefault();
            lastTouchEnd = now;
        };
        document.addEventListener("touchstart", onTouchStart, {passive: false});
        document.addEventListener("touchend", onTouchEnd, {passive: false});
        return () => {
            window.removeEventListener("load", registerSw);
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchend", onTouchEnd);
        };
    }, []);
}

function RootComponent() {
    useBrowserSetup();
    return (
        <RootDocument>
            <AppSplash/>
            <ErrorBoundary>
                <TooltipProvider>
                    <Toaster/>
                    <Sonner/>
                    <AppBackground/>
                    <Outlet/>
                </TooltipProvider>
            </ErrorBoundary>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru">
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
        <Scripts/>
        </body>
        </html>
    );
}
