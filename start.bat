@echo off
echo ========================================================
echo   Rinnovami ^| رينوفامي - نظام متابعة وتجديد الوثائق الذكي
echo ========================================================
echo.
echo جاري تشغيل الخادم وفتح البرنامج في المتصفح...
echo Avvio del server e apertura nel browser...
echo.
timeout /t 2 /nobreak > nul
start "" http://localhost:5173
npm run dev
pause
