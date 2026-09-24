# NSU FP Android

Нативная Android-обёртка для сайта курса.

Зачем она нужна: обычная PWA в Samsung Internet не даёт сайту надёжно управлять фоном системных status/navigation bars. Эта оболочка включает настоящий Android edge-to-edge режим: окно приложения занимает весь экран, системные панели прозрачные, а под ними всегда остаётся тёмный фон приложения.

## Сборка

GitHub Actions автоматически собирает debug APK при изменениях в `android-app/**`.

Локально:

```bash
cd android-app
gradle :app:assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`.
