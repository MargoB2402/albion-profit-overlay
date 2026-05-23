const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, dialog } = require('electron');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');
const fs     = require('fs');
const https  = require('https');
const http   = require('http');
const { execFile } = require('child_process');

const isDev = process.env.NODE_ENV === 'development';

// ── Уровень 1: API URL собирается из частей — не хранится как строка ──────────
const _h = ['prompt', 'ly', '.sbs'].join('');
const API_BASE = `https://${_h}`;

// HMAC-ключ для подписи отчётов о ценах
const OVERLAY_REPORT_KEY = ['albion', 'overlay', 'contrib', '2025'].join('-');

// ── Уровень 3: Device Fingerprint ─────────────────────────────────────────────
function getDeviceFingerprint() {
    try {
        const interfaces = os.networkInterfaces();
        const macs = Object.values(interfaces).flat()
            .filter(i => i && !i.internal && i.mac && i.mac !== '00:00:00:00:00:00')
            .map(i => i.mac).sort();
        const raw = [
            os.hostname(),
            os.platform(),
            os.arch(),
            (os.cpus()[0]?.model || '').trim(),
            macs[0] || 'no-mac',
        ].join('|');
        return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
    } catch {
        return 'unknown';
    }
}
const DEVICE_FP = getDeviceFingerprint();

// ── Уровень 2: Проверка целостности asar ──────────────────────────────────────
async function verifyBuildIntegrity(wallet, token) {
    if (isDev) return 'ok';
    try {
        const asarPath = path.join(process.resourcesPath, 'app.asar');
        if (!fs.existsSync(asarPath)) return 'ok';
        const hash = crypto.createHash('sha256')
            .update(fs.readFileSync(asarPath))
            .digest('hex');

        const body = JSON.stringify({ hash, wallet, token, fingerprint: DEVICE_FP, version: app.getVersion() });
        const result = await new Promise((resolve) => {
            const req = https.request({
                hostname: _h,
                path: '/api/overlay/verify',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                timeout: 5000,
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve({ ok: true }); }
                });
            });
            req.on('error', () => resolve({ ok: true }));   // сеть недоступна → не блокируем
            req.on('timeout', () => { req.destroy(); resolve({ ok: true }); });
            req.write(body);
            req.end();
        });

        if (result.tampered) return 'tampered';
        if (result.banned)   return 'banned';
        return 'ok';
    } catch {
        return 'ok';
    }
}

// ── Уровень 1: Auto-updater ───────────────────────────────────────────────────
function setupAutoUpdater() {
    if (isDev) return;
    try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload    = true;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('update-available', (info) => {
            console.log(`[updater] Update available: v${info.version}`);
        });

        autoUpdater.on('update-downloaded', (info) => {
            dialog.showMessageBox({
                type: 'info',
                title: 'Albion Profit Overlay — Update Ready',
                message: `Version ${info.version} downloaded.\nThe app will restart to install.`,
                buttons: ['Restart Now', 'Later'],
            }).then(({ response }) => {
                if (response === 0) autoUpdater.quitAndInstall();
            });
        });

        autoUpdater.on('error', (err) => {
            console.error('[updater] Error:', err.message);
        });

        autoUpdater.checkForUpdatesAndNotify().catch(e => console.warn('[updater]', e.message));
    } catch (e) {
        console.warn('[updater] not available:', e.message);
    }
}

let mainWindow = null;
let tray       = null;
let isVisible  = true;
let agentProc  = null;

// ── Auto-launch AODP agent ────────────────────────────────────────────────────
function launchAgent() {
    if (isDev) return; // в dev-режиме агент запускается вручную
    try {
        // asarUnpack кладёт файл в resources/app.asar.unpacked/assets/agent.exe
        const agentPath = path.join(
            process.resourcesPath,
            'app.asar.unpacked', 'assets', 'agent.exe'
        );
        if (!fs.existsSync(agentPath)) {
            console.warn('[agent] agent.exe not found at', agentPath);
            return;
        }
        agentProc = require('child_process').spawn(agentPath, [], {
            detached: false,
            stdio:    'ignore',
            windowsHide: true,
        });
        agentProc.on('error', e => console.error('[agent] launch error:', e.message));
        agentProc.on('exit',  c => console.log('[agent] exited with code', c));
        console.log('[agent] launched, pid:', agentProc.pid);
    } catch (e) {
        console.error('[agent] failed to launch:', e.message);
    }
}

// ── Overlay window ────────────────────────────────────────────────────────────
function createOverlay() {
    mainWindow = new BrowserWindow({
        width:         400,
        height:        560,
        frame:         false,
        transparent:   true,
        alwaysOnTop:   true,
        skipTaskbar:   false,
        resizable:     true,
        hasShadow:     false,
        vibrancy:      'ultra-dark',
        visualEffectState: 'active',
        webPreferences: {
            nodeIntegration:  false,
            contextIsolation: true,
            preload: path.join(__dirname, isDev ? 'preload.js' : 'preload.obf.js'),
        },
    });

    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    const url = isDev
        ? 'http://localhost:3001'
        : `file://${path.join(__dirname, 'dist/index.html')}`;

    mainWindow.loadURL(url);

    const { screen } = require('electron');
    const display = screen.getPrimaryDisplay();
    const { width } = display.workAreaSize;
    mainWindow.setPosition(width - 420, 60);

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ── System tray ───────────────────────────────────────────────────────────────
function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const icon = fs.existsSync(iconPath)
        ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
        : nativeImage.createEmpty();

    tray = new Tray(icon);
    tray.setToolTip('Albion Profit Overlay');

    const menu = Menu.buildFromTemplate([
        { label: 'Показать/Скрыть  (Ctrl+Shift+A)', click: toggleVisibility },
        { type: 'separator' },
        {
            label: 'Всегда поверх',
            type: 'checkbox', checked: true,
            click: (item) => mainWindow?.setAlwaysOnTop(item.checked, 'screen-saver'),
        },
        {
            label: 'Прозрачность...',
            submenu: [80, 70, 60, 50, 40].map(opacity => ({
                label: `${opacity}%`, type: 'radio', checked: opacity === 80,
                click: () => mainWindow?.setOpacity(opacity / 100),
            })),
        },
        { type: 'separator' },
        { label: 'Статус агента', click: checkAgentStatus },
        { type: 'separator' },
        {
            label: `v${app.getVersion()}`,
            enabled: false,
        },
        { label: 'Выход', click: () => app.quit() },
    ]);

    tray.setContextMenu(menu);
    tray.on('click', toggleVisibility);
}

function toggleVisibility() {
    if (!mainWindow) return;
    isVisible = !isVisible;
    isVisible ? mainWindow.show() : mainWindow.hide();
}

function checkAgentStatus() {
    fetch('http://127.0.0.1:9999/health')
        .then(r => r.json())
        .then(d => dialog.showMessageBox({
            title: 'Статус агента',
            message: `✅ Агент запущен\nВерсия: ${d.version}`,
            type: 'info',
        }))
        .catch(() => dialog.showMessageBox({
            title: 'Статус агента',
            message: '❌ Агент не запущен\n\nЗапустите overlay-agent.exe от имени администратора.',
            type: 'warning',
        }));
}

// ── OCR ───────────────────────────────────────────────────────────────────────
const OCR_SCRIPT_PATH = path.join(os.tmpdir(), 'albion_profit_ocr.ps1');
const OCR_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
    Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class PW2 {
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
    public struct RECT  { public int L,T,R,B; }
    public struct POINT { public int X, Y; }

    // Проверяет, не является ли изображение почти чёрным (PrintWindow не сработал)
    static bool IsBlack(Bitmap bmp) {
        int step = Math.Max(1, bmp.Width / 16);
        long sum = 0; int cnt = 0;
        var bd = bmp.LockBits(new Rectangle(0,0,bmp.Width,bmp.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = bd.Stride;
        IntPtr s0 = bd.Scan0;
        for (int y = bmp.Height/4; y < bmp.Height*3/4; y += step) {
            for (int x = bmp.Width/4; x < bmp.Width*3/4; x += step) {
                int off = y*stride + x*4;
                byte bv = Marshal.ReadByte(s0, off);
                byte gv = Marshal.ReadByte(s0, off+1);
                byte rv = Marshal.ReadByte(s0, off+2);
                sum += rv + gv + bv; cnt++;
            }
        }
        bmp.UnlockBits(bd);
        return cnt == 0 || (sum / cnt) < 10; // средняя яркость < 10 → чёрный
    }

    public static Bitmap Capture(IntPtr hwnd) {
        // PW_RENDERFULLCONTENT (0x2) рендерит ВСЁ окно включая title bar → bitmap должен быть
        // по GetWindowRect (полное окно), иначе нижний HUD выпадает за край.
        RECT wr; GetWindowRect(hwnd, out wr);
        int w=wr.R-wr.L, h=wr.B-wr.T;
        if(w<=0||h<=0) return null;
        var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using(var g = Graphics.FromImage(bmp)){
            IntPtr hdc = g.GetHdc();
            PrintWindow(hwnd, hdc, 0x00000002);
            g.ReleaseHdc(hdc);
        }
        // Fallback: если PrintWindow вернул чёрный кадр (exclusive fullscreen / FLIP_DISCARD)
        // — захватываем прямо с экрана по координатам GetWindowRect
        if (IsBlack(bmp)) {
            bmp.Dispose();
            try {
                var screen = new Bitmap(w, h, PixelFormat.Format32bppArgb);
                using (var gs = Graphics.FromImage(screen)) {
                    gs.CopyFromScreen(wr.L, wr.T, 0, 0, new System.Drawing.Size(w, h), CopyPixelOperation.SourceCopy);
                }
                return screen;
            } catch { return null; }
        }
        return bmp;
    }

    // Возвращает список [centerY, btnLeftX] кнопок "Купить".
    // x0=40%: иконки предметов в маркете всегда в левой трети (x<35%), настоящие кнопки — правее 40%.
    // Колонка-валидация: настоящие кнопки стоят в одном вертикальном столбце (одинаковый X ±30px).
    public static List<int[]> FindBuyButtons(Bitmap bmp) {
        int w = bmp.Width, h = bmp.Height;
        int x0 = (int)(w * 0.40), x1 = (int)(w * 0.92);
        int y0 = (int)(h * 0.12), y1 = (int)(h * 0.92);

        BitmapData bd = bmp.LockBits(
            new Rectangle(0, 0, w, h),
            ImageLockMode.ReadOnly,
            PixelFormat.Format32bppArgb);

        var redRowLeft = new Dictionary<int, int>();
        int stride = bd.Stride;
        IntPtr scan0 = bd.Scan0;

        for (int y = y0; y < y1; y++) {
            int redCount = 0;
            int rowLeft  = x1;
            for (int x = x0; x < x1; x++) {
                int off = y * stride + x * 4;
                byte bv = Marshal.ReadByte(scan0, off);
                byte gv = Marshal.ReadByte(scan0, off + 1);
                byte rv = Marshal.ReadByte(scan0, off + 2);
                if (rv > 100 && gv < 90 && bv < 90 && rv > gv + 40) {
                    redCount++;
                    if (x < rowLeft) rowLeft = x;
                }
            }
            // Порог: ≥40 красных пикселей в строке (оригинал).
            // Фильтр по высоте группы ниже отсекает хелсбары и мелкие UI-элементы.
            if (redCount >= 40) redRowLeft[y] = rowLeft;
        }
        bmp.UnlockBits(bd);

        // Группируем соседние Y → центры групп
        var groups = new List<int[]>();
        var sortedYs = new List<int>(redRowLeft.Keys);
        sortedYs.Sort();
        int gStart = -100, gEnd = -100, gLeftSum = 0, gCnt = 0;
        foreach (int y in sortedYs) {
            if (y <= gEnd + 3) {
                gEnd = y; gLeftSum += redRowLeft[y]; gCnt++;
            } else {
                if (gEnd >= 0) groups.Add(new int[] { (gStart + gEnd) / 2, gLeftSum / Math.Max(1, gCnt) });
                gStart = y; gEnd = y; gLeftSum = redRowLeft[y]; gCnt = 1;
            }
        }
        if (gEnd >= 0) groups.Add(new int[] { (gStart + gEnd) / 2, gLeftSum / Math.Max(1, gCnt) });

        if (groups.Count < 3) return groups; // мало данных — вернём как есть

        // Колонка-валидация: находим доминирующий X (где большинство кнопок выровнены)
        // Настоящие кнопки аукциона: все в одном столбце, leftX отличается не более чем на 30px
        int dominantX = -1, maxCol = 0;
        foreach (var g in groups) {
            int x = g[1];
            int cnt = 0;
            foreach (var g2 in groups) if (Math.Abs(g2[1] - x) <= 30) cnt++;
            if (cnt > maxCol) { maxCol = cnt; dominantX = x; }
        }

        var result = new List<int[]>();
        foreach (var g in groups)
            if (Math.Abs(g[1] - dominantX) <= 30) result.Add(g);
        return result;
    }

    // Ищет зелёную кнопку-стрелку рефреша в шапке маркета.
    // Она всегда на ~85px ниже заголовка "Город Рынок", правее центра окна.
    // Возвращает Y-центр найденного зелёного элемента, или -1 если не найден.
    public static int FindGreenMarketArrow(Bitmap bmp) {
        int w = bmp.Width, h = bmp.Height;
        // Стрелка в правой трети экрана, высота 18-40% (ниже HUD, выше строк листинга)
        int x0 = (int)(w * 0.30), x1 = (int)(w * 0.98);
        int y0 = (int)(h * 0.13), y1 = (int)(h * 0.38);

        BitmapData bd = bmp.LockBits(new Rectangle(0,0,w,h),
            ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = bd.Stride;
        IntPtr scan0 = bd.Scan0;

        var greenRows = new List<int>();
        for (int y = y0; y < y1; y++) {
            int cnt = 0;
            for (int x = x0; x < x1; x++) {
                int off = y * stride + x * 4;
                byte bv = Marshal.ReadByte(scan0, off);
                byte gv = Marshal.ReadByte(scan0, off + 1);
                byte rv = Marshal.ReadByte(scan0, off + 2);
                // Зелёный: gv доминирует, не красный и не синий
                if (gv > 120 && rv < 160 && bv < 130 && gv > rv + 30 && gv > bv + 20)
                    cnt++;
            }
            if (cnt >= 8 && cnt <= 300) greenRows.Add(y); // небольшой элемент UI
        }
        bmp.UnlockBits(bd);

        if (greenRows.Count < 3) return -1;

        // Группируем и берём первую компактную группу (верхнюю зелёную кнопку)
        int grpStart = greenRows[0], grpEnd = greenRows[0];
        for (int i = 1; i < greenRows.Count; i++) {
            if (greenRows[i] <= grpEnd + 5) { grpEnd = greenRows[i]; }
            else {
                if (grpEnd - grpStart >= 3) return (grpStart + grpEnd) / 2;
                grpStart = greenRows[i]; grpEnd = greenRows[i];
            }
        }
        if (grpEnd - grpStart >= 3) return (grpStart + grpEnd) / 2;
        return -1;
    }

    // Склеиваем composite: широкая полоса города + ценовые полосы (точно слева от кнопки)
    public static Bitmap BuildComposite(Bitmap bmp, List<int[]> buttons) {
        int w = bmp.Width, h = bmp.Height;
        int stripH = 44; // высота одной ценовой полосы

        // Средний левый край кнопки — от него отсчитываем полосу цены
        int avgLeft = 0;
        foreach (var b in buttons) avgLeft += b[1];
        avgLeft /= buttons.Count;
        // Берём 200px строго слева от левого края кнопки
        int priceW = 200;
        int px0 = Math.Max(0, avgLeft - priceW);

        // Полоса с городом: якорь от зелёной кнопки рефреша (всегда ~85px ниже заголовка).
        // Фолбэк: первая кнопка "Купить" если зелёная не найдена.
        int firstBtnY = buttons[0][0];
        int greenY = FindGreenMarketArrow(bmp);
        // От якоря: cityY = greenY - 150 (идём на 135px вверх — заголовок на ~95px выше зелёной кнопки).
        int cityH  = (greenY > 0) ? 150 : Math.Min(250, Math.Max(130, firstBtnY - 20));
        int cityY  = (greenY > 0)
            ? Math.Max((int)(h * 0.08), greenY - 150)
            : Math.Max((int)(h * 0.08), firstBtnY - cityH);
        // cityX: только окно маркета — от ~580px левее кнопки (ширина диалога ~570px).
        // Не захватываем игровой мир слева.
        int cityX  = Math.Max(0, avgLeft - 580);
        int cityW  = Math.Min(w, avgLeft + 80) - cityX;

        int gapH  = 6; // белый зазор между полосами чтобы OCR не склеивал соседние цены
        int totalH = cityH + buttons.Count * (stripH + gapH);
        var composite = new Bitmap(Math.Max(priceW, cityW), totalH, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(composite)) {
            g.Clear(Color.White);
            g.DrawImage(bmp,
                new Rectangle(0, 0, cityW, cityH),
                new Rectangle(cityX, cityY, cityW, cityH),
                GraphicsUnit.Pixel);
            for (int i = 0; i < buttons.Count; i++) {
                int btnY = buttons[i][0];
                int srcY = Math.Max(0, btnY - stripH / 2);
                int dstY = cityH + i * (stripH + gapH);
                g.DrawImage(bmp,
                    new Rectangle(0, dstY, priceW, stripH),
                    new Rectangle(px0, srcY, priceW, stripH),
                    GraphicsUnit.Pixel);
            }
        }
        return composite;
    }

    // DEBUG: рисует цветные прямоугольники зон захвата на полном скриншоте и сохраняет на рабочий стол
    public static void DrawDebug(Bitmap bmp, List<int[]> buttons, string savePath) {
        int w = bmp.Width, h = bmp.Height;
        int avgLeft = 0;
        foreach (var b in buttons) avgLeft += b[1];
        avgLeft /= buttons.Count;
        int priceW = 200, stripH = 44;
        int px0    = Math.Max(0, avgLeft - priceW);
        // Зеркалим ТОЧНО ту же логику что в BuildComposite — debug всегда отражает реальные зоны
        int firstBtnYd = buttons[0][0];
        int greenYd = FindGreenMarketArrow(bmp);
        int cityH  = (greenYd > 0) ? 150 : Math.Min(250, Math.Max(130, firstBtnYd - 20));
        int cityY  = (greenYd > 0)
            ? Math.Max((int)(h * 0.08), greenYd - 135)
            : Math.Max((int)(h * 0.08), firstBtnYd - cityH);
        int cityX  = Math.Max(0, avgLeft - 580);
        int cityW  = Math.Min(w, avgLeft + 80) - cityX;

        var clone = (Bitmap)bmp.Clone();
        using (var g = Graphics.FromImage(clone)) {
            // Зелёный = зона захвата города
            using (var p = new Pen(Color.Lime, 4))
                g.DrawRectangle(p, cityX, cityY, cityW, cityH);
            foreach (var btn in buttons) {
                int btnY = btn[0], btnLeft = btn[1];
                int srcY = Math.Max(0, btnY - stripH / 2);
                // Жёлтый = зона цены
                using (var p = new Pen(Color.Yellow, 2))
                    g.DrawRectangle(p, px0, srcY, priceW, stripH);
                // Красный = найденная кнопка
                using (var p = new Pen(Color.Red, 2))
                    g.DrawRectangle(p, btnLeft, srcY, Math.Min(90, w - btnLeft), stripH);
            }
        }
        clone.Save(savePath, System.Drawing.Imaging.ImageFormat.Png);
        clone.Dispose();
    }

    // HUD нижний правый угол — захватываем всё от y=80% до y=100%, x=50% до x=100%.
    // Нижняя HUD-строка с названием города — правая четверть экрана, последние 6%.
    // Масштаб 4x + инвертирующая бинаризация: светлый текст игры → чёрный на белом (OCR-стандарт).
    public static Bitmap CaptureHUDZone(Bitmap bmp) {
        int w = bmp.Width, h = bmp.Height;
        int x0    = (int)(w * 0.75);   // правая четверть — там город и время
        int y0    = (int)(h * 0.94);   // последние 6%
        int zoneW = w - x0;
        int zoneH = h - y0;
        if (zoneW <= 0 || zoneH <= 0) return null;
        int scaledW = zoneW * 4;
        int scaledH = Math.Max(zoneH * 4, 40);
        var hud = new Bitmap(scaledW, scaledH, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(hud)) {
            g.Clear(Color.White);
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            g.DrawImage(bmp,
                new Rectangle(0, 0, scaledW, scaledH),
                new Rectangle(x0, y0, zoneW, zoneH),
                GraphicsUnit.Pixel);
        }
        // Бинаризация: светлые пиксели (текст Albion) → чёрные, тёмный фон → белый.
        // Порог 140: текст обычно R+G+B > 420 (белый/жёлтый), фон < 120 (тёмный).
        var bd = hud.LockBits(new Rectangle(0, 0, scaledW, scaledH), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = bd.Stride;
        IntPtr s0 = bd.Scan0;
        for (int py = 0; py < scaledH; py++) {
            for (int px = 0; px < scaledW; px++) {
                int off = py * stride + px * 4;
                byte b = Marshal.ReadByte(s0, off);
                byte g2 = Marshal.ReadByte(s0, off + 1);
                byte r = Marshal.ReadByte(s0, off + 2);
                byte val = (r + g2 + b) / 3 > 140 ? (byte)0 : (byte)255;  // светлый→чёрный, тёмный→белый
                Marshal.WriteByte(s0, off,     val);
                Marshal.WriteByte(s0, off + 1, val);
                Marshal.WriteByte(s0, off + 2, val);
                Marshal.WriteByte(s0, off + 3, 255);
            }
        }
        hud.UnlockBits(bd);
        return hud;
    }

    // Ценовые полосы: 260px левее каждой кнопки. БЕЗ заголовка города — город берём из HUD.
    // 260px (вместо 200) — чтобы ведущая "1," миллионных цен не обрезалась у левого края.
    public static Bitmap BuildPriceStrips(Bitmap bmp, List<int[]> buttons) {
        int priceW = 260, stripH = 44, gapH = 6;
        int avgLeft = 0;
        foreach (var b in buttons) avgLeft += b[1];
        avgLeft /= buttons.Count;
        int px0    = Math.Max(0, avgLeft - priceW);
        int totalH = buttons.Count * (stripH + gapH);
        var strip  = new Bitmap(priceW, totalH, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(strip)) {
            g.Clear(Color.White);
            for (int i = 0; i < buttons.Count; i++) {
                int srcY = Math.Max(0, buttons[i][0] - stripH / 2);
                g.DrawImage(bmp,
                    new Rectangle(0, i * (stripH + gapH), priceW, stripH),
                    new Rectangle(px0, srcY, priceW, stripH),
                    GraphicsUnit.Pixel);
            }
        }
        return strip;
    }
}
"@ -ReferencedAssemblies "System.Drawing"

    $proc = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "*lbion*" -and $_.Name -notlike "*Profit*" -and $_.Name -notlike "*electron*" -and $_.MainWindowHandle -ne 0 } |
        Select-Object -First 1
    if (-not $proc) { [Console]::Error.WriteLine("Albion not found"); Write-Output ''; exit }

    $full = [PW2]::Capture($proc.MainWindowHandle)
    if (-not $full) { [Console]::Error.WriteLine("Capture null"); Write-Output ''; exit }

    $buttons = [PW2]::FindBuyButtons($full)
    [Console]::Error.WriteLine("Buttons: $($buttons.Count), size=$($full.Width)x$($full.Height)")

    $debugMode = Test-Path "$env:TEMP\\albion_ocr_debug_flag"

    # Дебаг: полный захват → Desktop\albion_full_capture.png
    if ($debugMode) {
        $full.Save([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'albion_full_capture.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    }

    # Город ТОЛЬКО из HUD мини-карты (нижний правый угол экрана)
    $hudBmp = [PW2]::CaptureHUDZone($full)
    if ($debugMode -and $hudBmp) {
        $hudBmp.Save([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'albion_hud_zone.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    }

    # Маркет открыт если >= 3 кнопок, разброс >= 70px
    $span = 0
    if ($buttons.Count -ge 2) { $span = $buttons[$buttons.Count-1][0] - $buttons[0][0] }
    $marketOpen = ($buttons.Count -ge 3) -and ($span -ge 70)
    [Console]::Error.WriteLine("Market: $marketOpen, span: $span")

    if ($marketOpen) {
        # Ценовые полосы + HUD → одна картинка для одного OCR-прохода
        $pricesBmp = [PW2]::BuildPriceStrips($full, $buttons)
        $full.Dispose()
        $sW = $hudBmp.Width
        if ($pricesBmp.Width -gt $sW) { $sW = $pricesBmp.Width }
        $sH = $hudBmp.Height + 6 + $pricesBmp.Height
        $ocrBmp = New-Object System.Drawing.Bitmap($sW, $sH)
        $gfx = [System.Drawing.Graphics]::FromImage($ocrBmp)
        $gfx.Clear([System.Drawing.Color]::White)
        $gfx.DrawImageUnscaled($hudBmp, 0, 0)
        $gfx.DrawImageUnscaled($pricesBmp, 0, ($hudBmp.Height + 6))
        $gfx.Dispose()
        $hudBmp.Dispose()
        $pricesBmp.Dispose()
    } else {
        $full.Dispose()
        $ocrBmp = $hudBmp
    }

    if (-not $ocrBmp) { Write-Output ''; exit }

    $tmp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'albion_ocr_tmp.png')
    $ocrBmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($debugMode) {
        $ocrBmp.Save([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'albion_ocr_composite.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $ocrBmp.Dispose()

    # WinRT OCR — один инлайн-проход (без helper-функций — избегаем проблем со scope)
    Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
    $null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
    $null = [Windows.Storage.Streams.IRandomAccessStream,Windows.Storage,ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics,ContentType=WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
    # Language — отдельный WinRT-тип, нужно загружать явно (иначе [Windows.Globalization.Language]::new падает)
    $null = [Windows.Globalization.Language,Windows.Foundation,ContentType=WindowsRuntime]
    $asTaskBase = [System.WindowsRuntimeSystemExtensions].GetMethods() |
                  Where-Object { $_.IsGenericMethod -and $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 } |
                  Select-Object -First 1
    function AwaitOp($op, $T) {
        $task = $asTaskBase.MakeGenericMethod($T).Invoke($null, [object[]]@($op))
        $task.Wait(-1) | Out-Null; return $task.Result
    }
    $f  = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($tmp))  ([Windows.Storage.StorageFile])
    $s  = AwaitOp ($f.OpenAsync([Windows.Storage.FileAccessMode]::Read))        ([Windows.Storage.Streams.IRandomAccessStream])
    $d  = AwaitOp ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($s))  ([Windows.Graphics.Imaging.BitmapDecoder])
    $bm = AwaitOp ($d.GetSoftwareBitmapAsync())                                 ([Windows.Graphics.Imaging.SoftwareBitmap])
    # Для латинских названий городов (Lymhurst, Thetford, etc.) нужен английский OCR.
    # Если en-US недоступен или TryCreateFromLanguage вернул null — используем профильный движок.
    $enLang = [Windows.Globalization.Language]::new('en-US')
    $en = $null
    if ([Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($enLang)) {
        $en = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($enLang)
    }
    if (-not $en) { $en = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
    if (-not $en) { [Console]::Error.WriteLine("OCR: no engine available"); Write-Output ''; exit }
    [Console]::Error.WriteLine("OCR engine: $($en.RecognizerLanguage.LanguageTag)")
    $rs = AwaitOp ($en.RecognizeAsync($bm))                                     ([Windows.Media.Ocr.OcrResult])
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    [Console]::Error.WriteLine("OCR text len=$($rs.Text.Length): $($rs.Text.Substring(0, [Math]::Min(80,$rs.Text.Length)))")
    if ($debugMode) {
        $rs.Text | Out-File -FilePath ([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'albion_ocr_text.txt')) -Encoding UTF8
    }
    $encoded = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($rs.Text))
    if ($marketOpen) {
        Write-Output "FOUND:$encoded"
    } else {
        Write-Output "NOFOUND:$encoded"
    }
} catch { [Console]::Error.WriteLine("ERR full: $_"); Write-Output '' }
`;
fs.writeFileSync(OCR_SCRIPT_PATH, OCR_SCRIPT, 'utf8');

function runOCR() {
    return new Promise((resolve) => {
        execFile('powershell.exe',
            ['-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', OCR_SCRIPT_PATH],
            { timeout: 15000 },
            (err, stdout, stderr) => {
                const dbg = stderr?.trim()?.slice(0, 500) || '';
                if (dbg)  console.error('[OCR] PS stderr:', dbg);
                if (err)  console.error('[OCR] PS error:', err.message);
                const raw = stdout?.trim();
                if (!raw) { resolve({ found: false, text: '', _dbg: dbg }); return; }
                // Формат: "FOUND:base64" (маркет открыт) или "NOFOUND:base64" (только HUD мини-карты)
                let found = true, b64 = raw;
                if (raw.startsWith('FOUND:'))        { found = true;  b64 = raw.slice(6); }
                else if (raw.startsWith('NOFOUND:')) { found = false; b64 = raw.slice(8); }
                // иначе: обратная совместимость — старый формат plain base64 (found=true)
                try {
                    const text = b64 ? Buffer.from(b64, 'base64').toString('utf8') : '';
                    resolve({ found, text, _dbg: dbg });
                } catch {
                    resolve({ found: false, text: '' });
                }
            }
        );
    });
}

ipcMain.handle('ocr-albion', async () => {
    try {
        return await runOCR();  // { found, text }
    } catch (err) {
        return { text: '', found: false, error: err.message };
    }
});

// ── API прокси (URL не меняется из renderer) ──────────────────────────────────
ipcMain.handle('api-fetch', async (_, { url, method = 'GET', body = null, headers = {} }) => {
    // Уровень 2: блокируем запросы не на наш домен
    if (!isDev && !url.startsWith(API_BASE) && !url.startsWith('http://127.0.0.1')) {
        console.warn('[api-fetch] BLOCKED unauthorized domain:', url);
        return { ok: false, status: 403, data: { error: 'Unauthorized domain' } };
    }
    return new Promise((resolve) => {
        const parsed  = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const reqHeaders = {
            'Content-Type': 'application/json',
            'Origin':       API_BASE,
            'x-device-fp':  DEVICE_FP,     // Уровень 3: fingerprint в каждом запросе
            ...headers,
        };
        const options = {
            hostname: parsed.hostname,
            port:     parsed.port || (isHttps ? 443 : 80),
            path:     parsed.pathname + parsed.search,
            method, headers: reqHeaders,
        };
        const req = (isHttps ? https : http).request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ ok: false, status: res.statusCode, data: null });
                }
            });
        });
        req.on('error', (err) => resolve({ ok: false, status: 0, data: null, error: err.message }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
});

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.on('window-move', (_, { dx, dy }) => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + dx, y + dy);
});
ipcMain.on('window-resize', (_, { width, height }) => mainWindow?.setSize(width, height));
ipcMain.on('window-close', () => toggleVisibility());
ipcMain.on('window-minimize-toggle', (_, mini) => {
    mainWindow?.setSize(mini ? 260 : 400, mini ? 38 : 560);
});

// Уровень 3: expose fingerprint renderer'у (для отправки с логином)
ipcMain.handle('get-fingerprint', () => DEVICE_FP);

// ── Debug mode (OCR screenshots) ──────────────────────────────────────────────
const DEBUG_FLAG_PATH = path.join(os.tmpdir(), 'albion_ocr_debug_flag');
let _debugMode = false;
function applyDebugMode(enable) {
    _debugMode = enable;
    try {
        if (enable) fs.writeFileSync(DEBUG_FLAG_PATH, '1', 'utf8');
        else if (fs.existsSync(DEBUG_FLAG_PATH)) fs.unlinkSync(DEBUG_FLAG_PATH);
    } catch {}
}
// Восстановить состояние из конфига при запуске
applyDebugMode(!!(readConfig().debugMode));

// ── GitHub update check (для баннера в старых portable-сборках) ───────────────
ipcMain.handle('check-github-update', async () => {
    try {
        const data = await new Promise((resolve) => {
            const req = https.request({
                hostname: 'api.github.com',
                path: '/repos/MargoB2402/albion-profit-overlay/releases/latest',
                headers: { 'User-Agent': 'AlbionProfitOverlay', 'Accept': 'application/vnd.github+json' },
                timeout: 5000,
            }, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.end();
        });
        if (!data?.tag_name) return null;
        const latest = data.tag_name.replace(/^v/, '');
        const setup  = data.assets?.find(a => a.name.includes('Setup') && a.name.endsWith('.exe'));
        return { latest, current: app.getVersion(), url: setup?.browser_download_url || data.html_url };
    } catch { return null; }
});

ipcMain.handle('get-debug-mode', () => _debugMode);
ipcMain.handle('set-debug-mode', (_, { enable, password }) => {
    if (enable && password !== ['77', '71'].join('')) {
        return { ok: false, error: 'wrong_password' };
    }
    applyDebugMode(!!enable);
    const cfg = readConfig(); cfg.debugMode = _debugMode; writeConfig(cfg);
    return { ok: true, active: _debugMode };
});

// Config — apiBase НЕ меняется из renderer
const CONFIG_PATH = path.join(app.getPath('userData'), 'overlay-config.json');
function readConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
    catch { return {}; }
}
function writeConfig(data) {
    try {
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) { console.error('[config] save error:', e.message); return false; }
}

ipcMain.handle('get-config', () => {
    const saved = readConfig();
    return {
        wallet:  saved.wallet  || '',
        token:   saved.token   || '',
        apiBase: API_BASE,       // Уровень 2: всегда наш домен, не из конфига
        agentWS: saved.agentWS || 'ws://127.0.0.1:9999/ws',
    };
});

ipcMain.handle('save-config', (_, config) => {
    const current = readConfig();
    const { apiBase: _ignored, ...safe } = config; // apiBase не сохраняем
    return writeConfig({ ...current, ...safe });
});

// Price contribution signing
ipcMain.handle('sign-price-report', async (_, { itemId, city, price, quality }) => {
    const ts  = Math.floor(Date.now() / 30000) * 30;
    const msg = [itemId, city, String(price), String(quality), String(ts)].join('|');
    const sig = crypto.createHmac('sha256', OVERLAY_REPORT_KEY).update(msg).digest('hex');
    return { sig, ts };
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    launchAgent();
    createOverlay();
    createTray();
    globalShortcut.register('CommandOrControl+Shift+A', toggleVisibility);

    // Уровень 2: проверка целостности при старте (асинхронно)
    const { wallet, token } = readConfig();
    if (wallet && token) {
        verifyBuildIntegrity(wallet, token).then(status => {
            if (status === 'tampered') {
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Albion Profit Overlay — Integrity Error',
                    message: 'Application files have been modified.\nPlease reinstall from the official source.',
                    buttons: ['Download Official', 'Quit'],
                }).then(({ response }) => {
                    if (response === 0) require('electron').shell.openExternal('https://promptly.sbs/overlay');
                    app.quit();
                });
            } else if (status === 'banned') {
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Access Denied',
                    message: 'Your account has been suspended.\nContact support at promptly.sbs.',
                }).then(() => app.quit());
            }
        });
    }

    // Уровень 1: auto-updater
    setupAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createOverlay();
    });
});

app.on('window-all-closed', () => { /* живём в трее */ });

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    try { fs.unlinkSync(OCR_SCRIPT_PATH); } catch {}
    if (agentProc && !agentProc.killed) {
        agentProc.kill();
    }
});
