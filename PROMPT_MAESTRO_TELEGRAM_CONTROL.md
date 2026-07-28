# PROMPT MAESTRO: SISTEMA DE CONTROL REMOTO Y DESARROLLO VÍA TELEGRAM
# AGENTE OBJETIVO: GOOGLE ANTIGRAVITY — MODO BUILD AUTÓNOMO

Actuás como **Ingeniero de Software Principal y Arquitecto de Seguridad**. Tu tarea es diseñar,
programar, estructurar, verificar e instalar un sistema completo en Python para controlar esta PC
remotamente desde un celular mediante un Bot de Telegram, priorizando en todo momento la
**seguridad por sobre la comodidad**. Ningún atajo de conveniencia puede debilitar una capa de
seguridad descripta en este documento.

Si en algún punto una instrucción funcional entra en conflicto con una instrucción de seguridad,
**gana la seguridad**, y debés dejarlo asentado en el resumen final en vez de resolverlo por tu
cuenta relajando el guardrail.

---

## 0. RESUMEN EJECUTIVO

Vas a construir un bot de Telegram que corre en background en esta notebook Windows 11 y que me
permite, desde mi celular:
1. Ejecutar comandos de PowerShell/CMD dentro de directorios de proyecto autorizados.
2. Delegar tareas de codeo a un motor de IA (Ollama local, y opcionalmente un router de modelos
   propio u OpenCode) que puede generar y ejecutar código.
3. Monitorear el estado del sistema y de los proyectos (status, logs, git, screenshots).
4. Hacerlo todo con múltiples capas de seguridad que impidan daño accidental o abuso, incluso si
   el modelo de IA subyacente sugiere un comando peligroso.

El bot NO reemplaza mi criterio: para cualquier acción destructiva, pide confirmación explícita
antes de ejecutar.

---

## 1. ESPECIFICACIONES TÉCNICAS Y ENTORNO

- **Lenguaje:** Python 3.10+, en un entorno virtual (`venv`) dedicado, nunca en el Python global.
- **Sistema Operativo:** Windows 11. Los comandos de sistema se ejecutan vía **PowerShell 7
  (`pwsh`)** si está instalado; si no, hacer fallback a `powershell.exe` (5.1) y dejarlo
  registrado en el resumen final.
- **Librerías principales:**
  - `python-telegram-bot>=21.0` (API asíncrona, `Application.run_polling()`)
  - `python-dotenv`
  - `ollama` (cliente Python para modelos locales)
  - `requests`
  - `psutil` (métricas de sistema: CPU, RAM, disco, procesos)
  - `mss` (opcional, solo si implementás `/screenshot`)
- **Modo de conexión con Telegram:** **Polling**, no webhook. No hace falta abrir puertos, IP fija
  ni certificados TLS: el bot inicia la conexión saliente hacia los servidores de Telegram, lo
  cual es ideal para una notebook doméstica detrás de NAT.
- **Codificación de mensajes:** usar `parse_mode="HTML"` en vez de MarkdownV2. MarkdownV2 exige
  escapar ~18 caracteres especiales y es una fuente frecuente de errores de formato; HTML con
  `<pre>` y `<code>` es más simple y robusto para mostrar salidas de consola.

---

## 2. ESTRUCTURA COMPLETA DEL PROYECTO

Directorio raíz sugerido: `C:\Proyectos_IA\telegram-control\`

```
telegram-control/
├── AGENTS.md
├── README.md
├── requirements.txt
├── .gitignore
├── .env.example
├── .env
├── install.ps1
├── config.py
├── logger.py
├── sanitizer.py
├── executor.py
├── session_manager.py
├── ai_engine.py
├── bot.py
└── logs/               (se crea en runtime, vacío en el repo salvo un .gitkeep)
```

### Descripción funcional de cada archivo

**`AGENTS.md`**
Manual de conducta para el motor de IA que redacta comandos dentro de este sistema. Debe
establecer explícitamente:
- Nunca generar un comando destructivo (borrar, sobrescribir, detener servicios, modificar
  permisos) sin marcarlo como `REQUIERE_CONFIRMACION`.
- Nunca operar fuera de `ALLOWED_PROJECT_DIRS`.
- Nunca intentar leer, imprimir o transmitir el contenido de `.env` u otras credenciales.
- Preferir siempre comandos de solo lectura/diagnóstico antes de proponer una modificación.
- Explicar en una línea qué hace un comando antes de ejecutarlo, la primera vez que se usa ese
  tipo de comando en la sesión.

**`requirements.txt`**
Dependencias con versión mínima fijada (no versiones exactas cerradas, para no romper con
parches de seguridad): `python-telegram-bot>=21.0`, `python-dotenv>=1.0`, `ollama`, `requests`,
`psutil`. Agregar `mss` solo si se implementa `/screenshot`.

**`.gitignore`**
Debe excluir como mínimo: `.env`, `venv/`, `__pycache__/`, `*.pyc`, `logs/*.log`,
`logs/audit.db`. El objetivo es que este proyecto pueda vivir en un repo Git sin filtrar jamás
el token del bot ni el ID de Telegram.

**`config.py`**
Carga y **valida estrictamente** las variables de `.env`. Si falta una variable obligatoria
(`TELEGRAM_BOT_TOKEN`, `MI_TELEGRAM_ID`, `ALLOWED_PROJECT_DIRS`), el programa debe abortar el
arranque con un mensaje de error claro en consola — nunca arrancar en un estado a medio
configurar. Convierte `ALLOWED_PROJECT_DIRS` (string separado por comas) en una lista de rutas
absolutas normalizadas, y valida que cada una exista en disco.

**`logger.py`**
Logging estructurado con `RotatingFileHandler` (máx. 5 MB por archivo, 5 backups). Dos streams
separados:
- `logs/app.log`: eventos del programa (arranque, errores, reconexiones).
- `logs/audit.log`: **auditoría de comandos** — quién (siempre el mismo `user_id` autorizado),
  qué comando se pidió ejecutar, timestamp, y si fue aprobado/rechazado/bloqueado por qué capa.
  Este archivo nunca se trunca automáticamente por fuera de la rotación por tamaño, y su
  contenido pasa siempre por `sanitizer.py` antes de escribirse.

**`sanitizer.py`**
Filtro que se aplica a **toda** salida antes de mandarla a Telegram o escribirla en logs:
- Detecta por patrón (no solo por palabra exacta) claves y tokens: variables tipo
  `*PASSWORD*`, `*SECRET*`, `*TOKEN*`, `*_KEY*`, `Bearer <valor>`, bloques `-----BEGIN...KEY-----`,
  cadenas con forma de API key (prefijos largos alfanuméricos), y reemplaza el valor por
  `[DATO_SENSIBLE_REDACTADO]` conservando el nombre de la variable para que el mensaje siga
  siendo legible.
- Nunca deja pasar el contenido completo de `.env`, aunque el usuario autorizado lo pida
  explícitamente por chat — en ese caso, responde qué variables existen (solo nombres) sin
  valores.

**`executor.py`**
Ejecución **sandboxeada** de PowerShell/CMD. Responsabilidades:
- Recibe el comando, valida que el directorio de trabajo actual esté dentro de
  `ALLOWED_PROJECT_DIRS` antes de ejecutar nada.
- Aplica la lista negra de rutas y comandos (sección 4, Capa B) — **por defecto todo lo no
  explícitamente permitido en un directorio autorizado se trata como sospechoso**, no al revés.
- Corre el proceso con `asyncio.create_subprocess_exec` (nunca `shell=True` sin sanitizar) y
  timeout configurable (`COMMAND_TIMEOUT_SECONDS`, default 45s), matando el proceso e hijos si
  se excede.
- Trunca stdout/stderr a `MAX_OUTPUT_CHARS` (default ~3500, límite práctico de un mensaje de
  Telegram) y avisa que el log completo quedó en `logs/`.
- Devuelve un objeto estructurado (código de salida, stdout, stderr, duración) — nunca imprime
  directo, para que `bot.py` decida el formato.

**`session_manager.py`**
Estado en memoria por sesión (como solo hay un usuario autorizado, alcanza con un solo objeto de
estado, pero dejalo modelado como diccionario por `user_id` para poder escalar):
- `active_project_dir`: cuál de los `ALLOWED_PROJECT_DIRS` está activo (comando `/cd`).
- `conversation_history`: contexto de la conversación con `ai_engine.py`, limpiable con `/reset`.
- `locked`: booleano de kill-switch (Capa E).
- `pending_confirmation`: comando en espera de que el usuario apriete Sí/No.

**`ai_engine.py`**
Motor de IA con lógica de despacho:
- Consultas cortas / de chat → modelo local vía `ollama`.
- Tareas de codeo o generación de comandos más largas → invocar CLI externo (`opencode` o
  Antigravity, según lo que esté instalado) capturando su salida.
- **Punto de integración opcional:** si ya existe un router propio de modelos gratuitos (por
  ejemplo un script que rota modelos de OpenRouter según tipo de tarea), `ai_engine.py` puede
  invocarlo como fallback en vez de depender únicamente de Ollama local — dejalo como hook
  configurable (`AI_BACKEND=ollama|external_router|opencode`) en vez de hardcodearlo.
- Cuando el modelo devuelve un bloque \`\`\`powershell o \`\`\`cmd, `ai_engine.py` lo pasa a
  `executor.py` — nunca lo ejecuta directamente él mismo.

**`bot.py`**
Servidor principal asíncrono. Responsabilidades:
- Autenticación por ID en **cada** update entrante (mensaje, callback de botón, comando).
- Registro de comandos (ver tabla en sección 5).
- Manejo de confirmaciones vía `InlineKeyboardMarkup` (botones Sí/No) para cualquier acción que
  `executor.py` marque como `REQUIERE_CONFIRMACION`.
- Chunking de mensajes largos (Telegram corta en ~4096 caracteres): dividir en múltiples mensajes
  o editar el mismo mensaje de forma incremental para salidas largas/streaming.
- Manejo global de excepciones por handler (un error en un comando no debe tumbar el bot
  completo) y reconexión con backoff exponencial si se cae la conexión con la API de Telegram.
- Notificación de arranque: al iniciar (o reiniciar tras un crash), el bot se manda un mensaje a
  sí mismo tipo "🟢 Bot iniciado — <timestamp>" para que sepas si se cayó y volvió solo.

**`install.ps1`**
Script de instalación: crea el `venv`, instala `requirements.txt`, corre
`python -m py_compile` sobre todos los `.py`, y **al final imprime, sin ejecutar**, el comando
`schtasks` sugerido para registrar el bot como tarea programada de inicio de sesión. Registrar
la tarea programada es una acción a nivel de sistema (fuera de `ALLOWED_PROJECT_DIRS`) y por eso
el script solo la sugiere: la ejecutás vos manualmente, o el agente la ejecuta únicamente si se
lo confirmás explícitamente en el chat de build.

**`.env.example`** (plantilla, sin valores reales)
```
TELEGRAM_BOT_TOKEN=
MI_TELEGRAM_ID=
ALLOWED_PROJECT_DIRS=C:\Proyectos_IA
DEFAULT_PROJECT_DIR=C:\Proyectos_IA
COMMAND_TIMEOUT_SECONDS=45
MAX_OUTPUT_CHARS=3500
UNLOCK_PIN=
AI_BACKEND=ollama
OLLAMA_HOST=http://localhost:11434
OPENCODE_CLI_PATH=
LOG_LEVEL=INFO
```

**`.env`**
Archivo real con mis valores. Nunca se commitea (ver `.gitignore`), nunca se imprime completo
por chat.

**`README.md`**
Guía de uso en criollo: cómo generar el token con @BotFather, cómo obtener mi `user_id`
(@userinfobot), cómo levantar el `venv`, comandos disponibles, y cómo usar `/lock` en caso de
pérdida o robo del celular.

---

## 3. GUARDRAILS DE SEGURIDAD (OBLIGATORIO, MULTICAPA)

### CAPA A — Autenticación por ID
El bot DEBE verificar `user_id` en cada update. Si no coincide con `MI_TELEGRAM_ID`, el mensaje
se ignora **silenciosamente** (no revelar que el bot existe respondiendo con un error) y el
intento queda registrado en `audit.log` con el ID que lo intentó.

### CAPA B — Control de rutas y comandos peligrosos
**Rutas prohibidas** (lectura, escritura o borrado bloqueados sin excepción):
`C:\Windows\`, `C:\Program Files\`, `C:\Program Files (x86)\`, `%APPDATA%`, `%LOCALAPPDATA%`,
`.ssh`, `.aws`, `.gnupg`, cualquier ruta fuera de `ALLOWED_PROJECT_DIRS`.

**Borrado seguro:** solo permitido dentro de `ALLOWED_PROJECT_DIRS`, y siempre pasa por
confirmación (Capa D), sin excepción, sin importar cuán "obviamente seguro" parezca el comando.

**Lista negra de comandos**, agrupada por motivo (bloqueo duro, no solo confirmación):
- *Integridad del sistema:* `format`, `diskpart`, `bcdedit`, `vssadmin delete shadows`,
  `Set-ExecutionPolicy`.
- *Credenciales / cuentas:* `cmdkey`, `netsh wlan show profile * key=clear`, `net user`,
  `net user administrator /active:yes`.
- *Registro / persistencia:* `reg add`, `reg delete`, `schtasks /create` (fuera del uso descripto
  en `install.ps1`, y siempre con confirmación).
- *Red / firewall:* `netsh advfirewall set allprofiles state off`.
- *Anti-forense / logs:* `wevtutil cl`, `Clear-EventLog`.
- *"Living-off-the-land" binaries frecuentes en malware:* `certutil -urlcache -split -f`,
  `mshta`, `regsvr32 /u /i:`, `rundll32` con URLs remotas, `wmic process call create`.
- *Defender / seguridad:* cualquier variante de `Set-MpPreference -Disable...`.

Estos comandos se **bloquean directamente** (no se ofrece botón de confirmación): si aparecen en
la salida sugerida por el motor de IA, `executor.py` los rechaza y le devuelve al motor de IA un
mensaje de error para que replantee el enfoque, en vez de ejecutarlos igual.

**Comandos que requieren confirmación (no bloqueo, pero sí botón Sí/No):**
`Remove-Item` con `-Recurse` o `-Force`, `Stop-Process`, `Stop-Service`, `git push --force` /
`--force-with-lease`, `npm publish`, cualquier sobrescritura de un archivo que ya existe fuera de
la carpeta de trabajo activa.

**Timeout:** todo comando corre con límite de `COMMAND_TIMEOUT_SECONDS` (default 45s),
matando el árbol de procesos si se excede.

### CAPA C — Sanitización de secretos
Ver especificación de `sanitizer.py` arriba. Se aplica a toda respuesta saliente y a todo lo que
se escribe en `audit.log`.

### CAPA D — Confirmación explícita para acciones destructivas
Toda acción marcada `REQUIERE_CONFIRMACION` se presenta con botones inline "✅ Confirmar" /
"❌ Cancelar". El comando NO se ejecuta hasta recibir el callback de confirmación, y expira solo
(se cancela) si no hay respuesta en 2 minutos.

### CAPA E — Kill switch (`/lock` y `/unlock`)
`/lock` desactiva inmediatamente la ejecución de cualquier comando (el bot sigue respondiendo
`/status` y mensajes informativos, pero rechaza todo lo demás). Útil si perdés el celular.
`/unlock <PIN>` reactiva el sistema, donde `<PIN>` se valida contra `UNLOCK_PIN` en `.env`
(secreto separado del token del bot, para que un token comprometido no alcance por sí solo).

### CAPA F — Rate limiting
Máximo N comandos por minuto por usuario (configurable, default razonable: 20/min) para evitar
loops accidentales del motor de IA o abuso si el token se filtra. Al superarse, se ignora el
exceso y se avisa una sola vez, no en cada mensaje descartado.

### CAPA G — Auditoría
Todo comando ejecutado, bloqueado o pendiente de confirmación queda en `audit.log` con
timestamp, y ese log nunca se borra automáticamente fuera de la rotación por tamaño.

### CAPA H — Límite de recursos por proceso
Los subprocesos lanzados no deben poder generar procesos hijos sin límite (proteger contra fork
bombs accidentales): usar `asyncio.create_subprocess_exec` con un único proceso por comando y
matar el árbol completo al timeout, no solo el proceso raíz.

### CAPA I — Notificación de arranque/caída
Al iniciar o reiniciar tras un error no manejado, el bot se autoenvía un mensaje de estado, para
detectar reinicios inesperados sin tener que revisar logs a mano.

---

## 4. FUNCIONALIDADES — COMANDOS DEL BOT

| Comando | Función |
|---|---|
| `/start`, `/help` | Lista de comandos disponibles y su uso |
| `/status` | CPU, RAM, disco, uptime del sistema y directorio de proyecto activo (via `psutil`) |
| `/projects` | Lista los directorios en `ALLOWED_PROJECT_DIRS` |
| `/cd <nombre>` | Cambia el proyecto activo (dentro de la whitelist únicamente) |
| `/reset` | Limpia el historial de conversación con `ai_engine.py` (no afecta `audit.log`) |
| `/git status\|commit\|push\|pull` | Wrappers seguros sobre git, dentro del proyecto activo |
| `/getfile <ruta relativa>` | Envía un archivo del proyecto activo al chat |
| Envío de archivo por Telegram | Lo guarda en una subcarpeta `inbox/` del proyecto activo |
| `/screenshot` (opcional) | Captura de pantalla actual, útil para seguir un build/preview visualmente |
| `/logs` | Últimas N líneas de `app.log` o `audit.log` (ya sanitizadas) |
| `/lock`, `/unlock <PIN>` | Kill switch, ver Capa E |
| Mensaje libre (texto) | Se interpreta como consulta/instrucción para `ai_engine.py`; si genera un bloque de código, se ofrece ejecutarlo (con confirmación si corresponde) |

Todas las respuestas largas (salida de comandos, logs) van en bloques `<pre>` para legibilidad en
el celular, cortadas en múltiples mensajes si superan el límite de Telegram.

---

## 5. MANEJO DE ERRORES Y RESILIENCIA

- Cada handler de `bot.py` envuelto en `try/except` propio: un error en un comando no debe
  crashear el proceso completo.
- Reconexión con backoff exponencial ante caídas de red o de la API de Telegram.
- Cualquier excepción no manejada se loguea completa (sanitizada) en `app.log` y dispara la
  notificación de la Capa I al reiniciar.
- `config.py` falla rápido y con mensaje claro si `.env` está incompleto — nunca arranca "a
  medias".

---

## 6. CHECKLIST DE ACEPTACIÓN (QA) — VERIFICAR ANTES DE REPORTAR ÉXITO

Antes de darme el resumen final, verificá y dejá constancia de cada punto:
1. `python -m py_compile` corre sin errores sobre **todos** los `.py` del proyecto.
2. `config.py` levanta una excepción clara si falta `TELEGRAM_BOT_TOKEN` o `MI_TELEGRAM_ID`
   (probalo temporalmente comentando una variable en una copia del `.env`, no en el real).
3. `sanitizer.py` redacta correctamente al menos un caso de prueba de cada patrón (password,
   token, bearer, clave RSA de ejemplo).
4. `executor.py` bloquea (no solo advierte) al menos un comando de cada categoría de la lista
   negra dura, y pide confirmación en al menos un comando de la lista de confirmación.
5. Un `user_id` distinto al configurado es ignorado sin respuesta visible.
6. `.gitignore` efectivamente excluye `.env` (correlo con `git check-ignore .env` si el proyecto
   ya es un repo git).
7. `logs/` se crea automáticamente si no existe, sin error.
8. El script `install.ps1` corre de punta a punta sin intervención manual salvo por la sugerencia
   final de `schtasks` (que NO debe ejecutarse solo).

---

## 7. MODO DE EJECUCIÓN AUTÓNOMA (BUILD MODE)

Procedé usando tus MCPs de Filesystem y Terminal, en este orden:

1. Crear la estructura de carpetas y el archivo `AGENTS.md`.
2. Escribir `.gitignore` y `.env.example` primero (antes que cualquier código), para que el
   proyecto nunca exista sin protección de secretos ni siquiera un instante.
3. Escribir el código modular completo: `config.py`, `logger.py`, `sanitizer.py`, `executor.py`,
   `session_manager.py`, `ai_engine.py`, `bot.py`.
4. Escribir `requirements.txt` e `install.ps1`.
5. Crear el `venv`, instalar dependencias mediante `install.ps1`.
6. Correr el checklist de la sección 6 completo.
7. Corregir de forma autónoma cualquier error de compilación, instalación o de los tests del
   checklist que surja, repitiendo el checklist hasta que todo pase.
8. Crear `.env` real vacío (solo con las claves, sin valores) y `README.md`.
9. **No** registrar la tarea programada de inicio automático: solo mostrarme el comando
   `schtasks` sugerido para que yo decida cuándo ejecutarlo.

---

## 8. ENTREGABLE FINAL

Al terminar, presentame un resumen que confirme explícitamente:
- Qué archivos se crearon y con qué responsabilidad cada uno.
- Que las 9 capas de seguridad (A a I) están implementadas y en qué archivo vive cada una.
- Resultado del checklist de aceptación, punto por punto.
- Qué variables me faltan completar en `.env` (`TELEGRAM_BOT_TOKEN`, `MI_TELEGRAM_ID`,
  `UNLOCK_PIN`, y `ALLOWED_PROJECT_DIRS` si quiero agregar más carpetas).
- El comando exacto de `schtasks` sugerido para persistencia, sin haberlo ejecutado.
