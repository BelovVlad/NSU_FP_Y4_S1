# NSU FP Android

Нативная Android-обёртка для сайта курса.

Зачем она нужна: обычная PWA в Samsung Internet не даёт сайту надёжно управлять фоном системных status/navigation bars. Эта оболочка включает настоящий Android edge-to-edge режим: окно приложения занимает весь экран, системные панели прозрачные, а под ними всегда остаётся тёмный фон приложения.

## Сборка

GitHub Actions автоматически собирает debug APK при изменениях в `_dev/android-app/**`.

Локально:

```bash
cd _dev/android-app
gradle :app:assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`.

## Ключ подписи обновлений

Установленное приложение принимает обновление только с той же подписью, поэтому
ключ хранится вне репозитория. В GitHub (Settings → Secrets and variables → Actions)
нужны секреты:

- `NSUFP_KEYSTORE_BASE64` — файл ключа в base64 (`base64 -w0 keys/nsufp-update.keystore`);
- `NSUFP_STORE_PASSWORD`, `NSUFP_KEY_PASSWORD` — пароли хранилища и ключа.

Локально ключ лежит в `keys/`, а пути и пароли — в `keystore.properties`
(обе записи в `.gitignore`):

```properties
NSUFP_KEYSTORE=keys/nsufp-update.keystore
NSUFP_STORE_PASSWORD=…
NSUFP_KEY_ALIAS=nsufp
NSUFP_KEY_PASSWORD=…
```

Без ключа сборка подписывается отладочным ключом: такой APK можно поставить
только начисто, поверх установленного приложения он не встанет.
