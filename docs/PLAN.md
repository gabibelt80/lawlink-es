# MAPA MAESTRO DE IMPLEMENTACIÓN — LAWLINK / JURIDICTAS
Versión: 0.5.0
Estado: EN IMPLEMENTACION (rama dev)
Fecha: 2026-09-16
Última revisión: cierre del Chat #3

═══════════════════════════════════════════════════════════════════
REGLA 0 — CÓMO USAR ESTE DOCUMENTO
═══════════════════════════════════════════════════════════════════

- Este MD es la ÚNICA fuente de verdad del proyecto.
- Se pega al inicio de CADA chat nuevo antes de pedir cualquier cosa.
- La IA debe leerlo completo antes de responder.
- Al final de cada chat, la IA devuelve el MD actualizado.
- NUNCA se implementa nada que no esté aprobado acá.
- NUNCA se modifica producción sin autorización explícita.
- Los cambios se versionan: v0.1 → v0.2 → ... nunca se sobreescribe.
- Si un chat se desvía, se cierra y se abre otro con este MD como ancla.

═══════════════════════════════════════════════════════════════════
SECCIÓN 1 — SISTEMA ACTUAL (foto real, sin suposiciones)
═══════════════════════════════════════════════════════════════════

1.1 IDENTIDAD
- Nombre: LawLink (carpeta) / Juridictas (DB y usuario del sistema)
- Ubicación server: /opt/juridictas/lawlink/
- Host server: macserver-M (Ubuntu 24.04)
- Acceso server: Tailscale 100.104.10.13
- Disco server: 879G total, 768G libres
- Repo remoto: https://github.com/gabibelt80/lawlink-es.git
- Ubicación PC desarrollo: C:\Users\Gbelt\juridictas\lawlink (Windows)

1.2 STACK TÉCNICO CONFIRMADO
- Runtime: Node.js v22.23.2
- Framework: Next.js 16.2.7 (App Router)
- Lenguaje: TypeScript 5.7.2
- ORM: Prisma 5.22.0
- DB: PostgreSQL 16.15 (locale es_AR.UTF-8)
- Editor documentos: Tiptap 3.x + LibreOffice 24.2.7.2 (headless)
- Auth: NextAuth 4.24 + Prisma Adapter
- UI: Radix UI + TailwindCSS 3.4 + Recharts + Framer Motion
- Documentos: docx 9.7 + docxtemplater 3.68 + mammoth + html-to-docx
- PDFs: pdfjs-dist + unpdf
- OCR: tesseract.js
- Excel: exceljs
- IA: cliente custom en src/lib/ai/client.ts (proveedor NO CONFIRMADO)
- i18n: i18next + tacotranslate (herencia china, a revisar)
- Pagos: Mercado Pago
- Monitoreo: Netdata
- Proceso: PM2 (proceso "lawlink", fork mode, online)
- Docker: circulo_app (puerto 3002), circulo_db (postgres-alpine)

1.3 ESTRUCTURA DE CARPETAS (nivel 2)
/opt/juridictas/lawlink/
  ├── src/
  │   ├── app/
  │   │   ├── (app)/          ← App autenticada
  │   │   │   ├── agents/      ← Panel agentes IA
  │   │   │   │   └── jurisprudence/ ← ⚠️ YA EXISTE
  │   │   │   ├── admin/       ← Super admin
  │   │   │   └── settings/ai/ ← Config IA por estudio
  │   │   └── (legal)/         ← Términos y privacidad
  │   ├── server/
  │   │   ├── admin/
  │   │   ├── ai/              ← 17 archivos lógica IA
  │   │   ├── settings/
  │   │   └── yuandian/        ← ⚠️ A ELIMINAR
  │   ├── lib/
  │   │   ├── ai/              ← client.ts + settings.ts
  │   │   └── yuandian/        ← ⚠️ A ELIMINAR
  │   └── scripts/
  ├── prisma/
  │   └── schema.prisma        ← 58 modelos
  ├── storage/
  │   ├── matters/             ← carpetas por caso
  │   ├── templates/
  │   └── m_[cuid]/            ← archivos por caso
  ├── escritos/                ← 100+ plantillas .txt
  ├── escritos-pdf/
  ├── escritos-viejos/
  ├── docs/                    ← documentación
  │   └── PLAN.md              ← este documento
  ├── public/
  ├── scripts/
  ├── ecosystem.config.js      ← config PM2
  └── backups/

1.4 BASE DE DATOS
- PostgreSQL 16.15 local
- DB principal: `juridictas`
- DB del estudio actual: `juridictas_juridictas`
- Modelo multi-tenant: DB por estudio
  (Firm + FirmUser en DB principal, operativas en DB por estudio)
- 58 tablas totales
- Tamaño actual: 22 MB
- Extensiones: solo plpgsql (⚠️ NO tiene pgvector)

1.5 AGENTES IA ACTUALES
Ubicación: src/server/ai/
- case-chat.ts              ← chat sobre un caso
- document-chat.ts          ← chat sobre un documento
- draft-document.ts         ← redacción de escritos
- review-document.ts        ← revisión IA de documentos
- batch-review-matter.ts    ← revisión por lote
- matter-review-summary.ts  ← resumen de caso
- recommend-cause.ts        ← sugerencia de causa
- parse-summons.ts          ← parseo de cédulas
- parse-pleading.ts         ← parseo de escritos
- parse-express.ts          ← parseo de envíos
- review-history.ts         ← historial de revisiones
- save-review.ts            ← guardar resultado
- actions.ts                ← acciones generales

Configuración: src/lib/ai/client.ts + settings.ts
Config UI: src/app/(app)/settings/ai/  ← POR ESTUDIO
Proveedor: NO CONFIRMADO (revisar client.ts)

1.6 FLUJO DE PROCESAMIENTO DE DOCUMENTOS (INTOCABLE)

1.6.1 Documentos de caso — code.json
- Cada Matter genera carpeta: storage/matters/[CODE]/
- Dentro hay un code.json con TODO lo del caso
- Ese JSON es la fuente de verdad para los agentes IA
- Los agentes (Editor, Auditor) leen de ahí
- El cliente NO ve esto
- ⚠️ INTOCABLE. NO MODIFICAR SU ESTRUCTURA BASE.

1.6.2 Documentos Word / escritos — pipeline txt
- Se suben .docx o .txt
- El sistema convierte a texto plano
- La IA opera sobre texto plano
- LibreOffice headless regenera .docx
- Visualmente se ve Word, se descarga Word
- ⚠️ INTOCABLE. JAMÁS TOCAR. Es la base operativa del sistema.

1.6.3 Implicancia para jurisprudencia
- La jurisprudencia nueva DEBE respetar estos flujos:
  · Si se asocia a un caso → se agrega al code.json (con cuidado)
  · Si es documentación general → usa pipeline de documentos
- NO inventar flujos paralelos de datos.

1.7 CÓMO CORRE EL SERVER
- Proceso: PM2 (`pm2 list` muestra "lawlink" online, id 0)
- Modo: fork (NO cluster)
- Restarts: 50 (⚠️ revisar por qué tantos)
- Memoria: ~200 MB
- Puerto principal: 3000 (next-server v16)
- Puerto secundario: 3002 (docker-proxy, circulo_app)
- Deploy: ecosystem.config.js
- Watch: PM2 "watching: disabled" ✅
- ⚠️ HALLAZGO: `node --watch src/server.js` como root (pid 42968) — verificar

1.8 VARIABLES DE ENTORNO (solo nombres)
NEXTAUTH_SECRET, NEXTAUTH_URL
APP_STORAGE_DIR, STORAGE_ENCRYPTION_KEY
NEXT_PUBLIC_TACOTRANSLATE_PUBLIC_API_KEY, TACOTRANSLATE_SECRET_API_KEY
NEXT_PUBLIC_TACOTRANSLATE_DEFAULT_LOCALE, NEXT_PUBLIC_TACOTRANSLATE_ORIGIN
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY
MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY
MERCADO_PAGO_CLIENT_ID, MERCADO_PAGO_CLIENT_SECRET

⚠️ NO hay OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY ni OLLAMA_URL
   → El proveedor IA debe estar guardado en DB (SystemSetting)
   → CONFIRMAR en src/lib/ai/client.ts y src/lib/ai/settings.ts

1.9 PROVEEDOR IA DEL SISTEMA
- Protocolo: OpenAI-compatible ({baseUrl}/chat/completions)
- Proveedor por defecto: Qwen (Alibaba Cloud) — se puede cambiar
- Config: tabla SystemSetting, clave "aiSettings", JSON cifrado
- Campos guardados: apiKeyCipher, baseUrl, textModel, visionModel
- API key: cifrada con STORAGE_ENCRYPTION_KEY (AES-256-GCM)
- Modelo default texto: gpt-4o-mini
- Modelo default vision: gpt-4o
- Cliente: src/lib/ai/client.ts (funciones aiChat, aiVision, extractJson)
- Config lectura/escritura: src/lib/ai/settings.ts
- Cualquier proveedor compatible OpenAI sirve: OpenAI, DeepSeek, Kimi,
  Zhipu, OpenRouter, Ollama, Qwen, etc.

1.10 UI JURISPRUDENCE EXISTENTE (auditoría Chat #3)
- page.tsx: carga constantes y renderiza la vista
- jurisprudence-agents-view.tsx: UI completa con:
  · Lista de 4 fuentes (SAIJ, CIJ, PJN, Fallos CSJN)
  · Lista de 3 agentes predefinidos:
    - civil_casacion (Camara Civil CABA)
    - laboral_riesgos (CNAT)
    - penal_garantias (CNCP)
  · Boton "Ejecutar" por agente
- ⚠️ El boton "Ejecutar" SIMULA con setTimeout(2000). No hace nada real.
- ⚠️ NO hay server action, scraper, ni persistencia asociada.
- Definiciones de fuentes y agentes: src/lib/ai-jurisprudence-agents.ts
- Estado real: UI LISTA, BACKEND FALTA.

1.11 MODULO JURISPRUDENCE EXISTENTE (auditoria completa Chat #3)

UI:
- src/app/(app)/jurisprudence/page.tsx + _components/jurisprudence-view.tsx
  → Vista publica: lista, busqueda, crear, eliminar (CRUD manual)
- src/app/(app)/admin/jurisprudence/page.tsx + _components/jurisprudence-admin-view.tsx
  → Panel admin
- src/app/(app)/agents/jurisprudence/page.tsx + _components/jurisprudence-agents-view.tsx
  → Panel de agentes IA (boton "Ejecutar" SIMULADO)

Server:
- src/server/jurisprudence/actions.ts
  → CRUD completo + filtros + import/export + options
  → Usa getTenantPrisma() (multi-tenant)
  → Usa requireSession() (auth)
  → Usa zod para validacion
  Funciones: listJurisprudence, createJurisprudence, deleteJurisprudence,
             listJurisprudenceFiltered, updateJurisprudence,
             importJurisprudenceBatch, exportJurisprudence,
             getJurisprudenceFilterOptions

Config:
- src/lib/ai-jurisprudence-agents.ts
  → 4 fuentes (SAIJ, CIJ, PJN, Fallos CSJN)
  → 3 agentes (civil_casacion, laboral_riesgos, penal_garantias)

QUE FALTA:
- Backend real de ingesta (buscar en SAIJ) ← Commit 3
- Conectar boton "Ejecutar" con server action real ← Commit 4
- Refresco automatico de la lista ← Commit 5

═══════════════════════════════════════════════════════════════════
SECCIÓN 2 — QUÉ SE QUIERE AGREGAR (alcance)
═══════════════════════════════════════════════════════════════════

2.1 MÓDULO JURISPRUDENCIA (modificar lo existente, no crear)

2.1.1 Estado actual (a verificar en Módulo 3)
- Modelo `Jurisprudence` YA EXISTE en schema.prisma
- UI `src/app/(app)/agents/jurisprudence/` YA EXISTE
- NO SE CREA DESDE CERO. SE MODIFICA Y SE COMPLETA.

2.1.2 Objetivo real
- Hacer que la jurisprudencia EXISTENTE funcione de verdad
- Agregar lo que le falta (ingesta, procesamiento, búsqueda)
- Integrarla con el flujo actual (code.json + documentos)
- NO rediseñar. NO reemplazar. COMPLETAR.

2.1.3 Lo que hay que averiguar antes de tocar nada
- ¿Qué campos del modelo Jurisprudence se usan hoy?
- ¿Qué hace exactamente jurisprudence-agents-view.tsx?
- ¿Hay datos cargados o está vacío?
- ¿Está conectado al sistema de módulos por estudio?
- ¿Está en el sidebar del dashboard?

2.2 BIBLIOTECA UNIFICADA
- Documentos propios del estudio (ya existen: FirmFile, WritingTemplate)
- Documentos descargados (nuevo)
- Documentos en procesamiento (nuevo)
- Todo bajo el mismo pipeline de conversión existente

2.3 FUERA DE ALCANCE (explícito)
- NO tocar producción hasta que Fase 0 esté validada
- NO modificar modelo de datos existente sin migración controlada
- NO romper el pipeline actual de escritos
- NO tocar la DB principal (solo la DB del estudio)
- NO reescribir el schema Prisma existente
- NO tocar code.json sin autorización explícita

═══════════════════════════════════════════════════════════════════
SECCIÓN 3 — ARQUITECTURA PROPUESTA (conceptual)
═══════════════════════════════════════════════════════════════════

3.1 PRINCIPIO RECTOR (4 reglas)

REGLA 1: NO TOCAR lo que funciona
- code.json por caso → INTOCABLE
- Flujo Word → txt → Word → INTOCABLE
- Agentes Editor y Auditor existentes → INTOCABLES en su lógica base
- Multi-tenant por DB → INTOCABLE

REGLA 2: COMPLETAR lo que existe a medias
- Jurisprudence ya existe → completar, no crear
- agents/jurisprudence/ ya existe → completar, no crear
- FirmFile ya existe → extender, no duplicar

REGLA 3: AGREGAR sin romper
- Nuevas tablas: solo si no hay equivalente
- Nuevos campos: solo si no rompen queries existentes
- Nuevos componentes: solo si no duplican existentes

REGLA 4: RESPETAR el flujo de datos actual
- Si jurisprudencia se asocia a un caso → va al code.json (con cuidado)
- Si es documentación general → va por pipeline de documentos
- NO crear rutas paralelas de datos

3.2 COMPONENTES NUEVOS
- Ingestor de fuentes (SAIJ, InfoLEG, CSJN, cámaras)
- Procesador de jurisprudencia (reutiliza pipeline)
- Indexador de texto (full-text primero, embeddings después)
- Vinculador causa↔jurisprudencia
- UI de biblioteca (extiende agents/jurisprudence existente)

3.3 INTEGRACIÓN SIN ROMPER
- Prisma migrate dev en LOCAL para campos nuevos
- FirmModuleSubscription para activar/desactivar por estudio
- SystemSetting para configurar fuentes por estudio
- ReviewRecord y Document para trazabilidad

═══════════════════════════════════════════════════════════════════
SECCIÓN 4 — MODELO DE DATOS (cambios propuestos)
═══════════════════════════════════════════════════════════════════

4.1 MODELO Jurisprudence EXISTENTE
Campos actuales:
  id, title, summary, fullText, court, jurisdiction, fuero,
  date, source, sourceUrl, category, tags[], createdById, matterId

A AGREGAR (propuesta, validar en Fase 2):
  - fingerprint String @unique  ← deduplicación
  - hash String                  ← sha256 del contenido
  - pdfPath String?              ← ruta al PDF
  - status String                ← pending/downloaded/processed/error
  - processedAt DateTime?
  - ingestBatchId String?        ← trazabilidad
  - citedInMatters Matter[]      ← relación N:M (si hace falta)

4.2 MODELOS NUEVOS (solo si hacen falta)
- JurisprudenceSource (catálogo de fuentes)
- JurisprudenceRelation (citas entre fallos)
- JurisprudenceMatterLink (vínculo fallo ↔ causa)
- JurisprudenceIngestLog (historial de ingesta)

4.3 MODELO Library EXISTENTE
- FirmFile: archivos del estudio (ya tiene categorías)
- WritingTemplate: plantillas de escritos
- Document: documentos por Matter

A AGREGAR (propuesta):
- LibraryItem (biblioteca unificada):
  - id, type (own/downloaded/processing), sourceUrl, metadata Json
  - Vinculado a FirmFile o Jurisprudence según type

4.4 REGLAS DE DATOS
- IDs: cuid()
- Fechas: DateTime con @default(now())
- Tags: String[]
- Índices: @@index en campos de búsqueda
- No tocar modelos existentes sin migración controlada

═══════════════════════════════════════════════════════════════════
SECCIÓN 5 — MÓDULOS A CONSTRUIR
═══════════════════════════════════════════════════════════════════

Cada módulo se cierra antes de avanzar al siguiente.

MÓDULO 1 — Revisión y limpieza del sistema actual
  Objetivo: eliminar yuandian, MariaDB, procesos auxiliares desconocidos.
  Criterios: cero referencias a yuandian, MariaDB detenido, documentado.
  Dependencias: ninguna.
  Riesgo: bajo (solo en local).

MÓDULO 2 — Preparación del entorno local
  Objetivo: replicar prod en local para trabajar sin riesgo.
  Criterios: DB local clonada, .env.local configurado, PM2 local.
  Dependencias: Módulo 1.
  Riesgo: bajo.

MÓDULO 3 — Auditoría de lo existente (CRÍTICO)
  Objetivo: entender qué hay antes de tocar.
  Tareas:
    a) Leer src/app/(app)/agents/jurisprudence/ completo
    b) Leer jurisprudence-agents-view.tsx completo
    c) Query a DB: SELECT COUNT(*) FROM "Jurisprudence";
    d) Ver si Jurisprudence está en FirmModuleSubscription
    e) Ver si aparece en sidebar del dashboard
    f) Ver cómo se relaciona con code.json (si lo hace)
    g) Confirmar proveedor IA en src/lib/ai/client.ts
    h) Identificar proceso node --watch root
  Criterios: informe escrito de qué existe y qué falta.
  Dependencias: Módulo 2.
  Riesgo: nulo (solo lectura).
  ⚠️ SIN ESTE MÓDULO CERRADO, NO SE AVANZA AL MÓDULO 4.

MÓDULO 4 — Modificación del modelo Jurisprudence
  Objetivo: agregar campos faltantes SIN romper lo existente.
  Tareas:
    a) Definir qué campos agregar (basado en Módulo 3)
    b) Prisma migrate dev en LOCAL
    c) Verificar queries existentes
    d) Verificar UI existente no se rompe
  Criterios: migración aplicada, UI funciona, tests pasan.
  Dependencias: Módulo 3.
  Riesgo: medio (tocar modelo existente).

MÓDULO 5 — Ingestor de fuentes (una sola, la primera)
  Objetivo: bajar fallos de UNA fuente y guardarlos.
  Criterios: descarga, procesa, guarda en DB, guarda PDF.
  Dependencias: Módulo 4.
  Riesgo: medio (depende de la fuente).

MÓDULO 6 — Indexador de jurisprudencia
  Objetivo: búsqueda full-text sobre fullText.
  Criterios: búsqueda funcional en UI, resultados ordenados.
  Dependencias: Módulo 5.
  Riesgo: bajo (PostgreSQL tsvector nativo).

MÓDULO 7 — Biblioteca unificada
  Objetivo: UI que muestre propias + descargadas + en proceso.
  Criterios: panel unificado, filtros, acciones por tipo.
  Dependencias: Módulo 5.
  Riesgo: bajo (solo UI + queries).

MÓDULO 8 — Vinculador causa ↔ jurisprudencia
  Objetivo: asociar fallos a causas automática y manualmente.
  Tareas:
    a) Definir formato de entrada en code.json
    b) Extender lógica de generación de code.json (SIN ROMPER)
    c) Probar con caso de prueba en LOCAL
  Criterios: caso de prueba tiene jurisprudencia en su code.json
             y los agentes Editor/Auditor la pueden leer.
  Dependencias: Módulo 6.
  Riesgo: ALTO (toca code.json).
  ⚠️ REQUIERE REVISIÓN ESPECIAL ANTES DE EJECUTAR.

MÓDULO 9 — Integración con agentes IA
  Objetivo: que Editor y Auditor usen la biblioteca.
  Criterios: agentes pueden citar fallos de la biblioteca.
  Dependencias: Módulo 8.
  Riesgo: medio (toca agentes existentes).

MÓDULO 10 — Búsqueda semántica (opcional)
  Objetivo: embeddings con pgvector.
  Criterios: búsqueda semántica funcional.
  Dependencias: Módulo 6.
  Riesgo: medio (instalar pgvector, generar embeddings).

═══════════════════════════════════════════════════════════════════
SECCIÓN 6 — FASES DE IMPLEMENTACIÓN
═══════════════════════════════════════════════════════════════════

FASE 0 — Preparación (sin tocar producción)
  Entregables: Módulos 1, 2, 3 cerrados.
  Criterio de avance: 3 módulos cerrados y documentados.
  Rollback: no aplica.

FASE 1 — Modelo y datos
  Entregables: Módulo 4 cerrado.
  Criterio: migración sin errores, DB local OK.
  Rollback: git revert schema + prisma migrate reset local.

FASE 2 — Ingesta
  Entregables: Módulo 5 cerrado.
  Criterio: 100 fallos descargados y guardados sin error.
  Rollback: borrar registros del batch.

FASE 3 — Búsqueda y biblioteca
  Entregables: Módulos 6 y 7 cerrados.
  Criterio: usuario puede buscar y ver biblioteca.
  Rollback: feature flag.

FASE 4 — Vinculación
  Entregables: Módulo 8 cerrado.
  Criterio: 3 causas con vinculaciones automáticas útiles.
  Rollback: feature flag.

FASE 5 — Integración con agentes
  Entregables: Módulo 9 cerrado.
  Criterio: Editor puede citar fallos de la biblioteca.
  Rollback: revertir cambios en archivos de agentes.

FASE 6 — Semántica (opcional)
  Entregables: Módulo 10 cerrado.
  Criterio: búsqueda semántica supera a full-text.
  Rollback: desinstalar extensión y borrar tablas.

═══════════════════════════════════════════════════════════════════
SECCIÓN 7 — DECISIONES TOMADAS (ADR log)
═══════════════════════════════════════════════════════════════════

| # | Decisión | Motivo | Fecha | Chat |
|---|----------|--------|-------|------|
| 001 | Todo se desarrolla en LOCAL primero | Riesgo de romper prod | 2026-09-16 | #1 |
| 002 | Eliminar yuandian del código | No se usa | 2026-09-16 | #1 |
| 003 | Eliminar MariaDB | No se usa | 2026-09-16 | #1 |
| 004 | NO tocar schema existente, solo agregar | Minimizar riesgo | 2026-09-16 | #1 |
| 005 | Reutilizar modelo Jurisprudence existente | Ya está en schema | 2026-09-16 | #1 |
| 006 | Usar pipeline de documentos para jurisprudencia | Coherencia | 2026-09-16 | #1 |
| 007 | NO implementar embeddings en Fase 1 | Complejidad | 2026-09-16 | #1 |
| 008 | code.json por caso es INTOCABLE | Fuente de verdad IA | 2026-09-16 | #2 |
| 009 | Flujo Word→txt→Word es INTOCABLE | Base operativa | 2026-09-16 | #2 |
| 010 | Jurisprudence se MODIFICA, no se crea | Ya existe | 2026-09-16 | #2 |
| 011 | Todo cambio respeta el flujo de datos actual | Coherencia | 2026-09-16 | #2 |
| 012 | Trabajar en rama dev, nunca en main | Aislar cambios | 2026-09-16 | #2 |
| 013 | cookies.txt fuera del repo + gitignore | Seguridad | 2026-09-16 | #2 |
| 014 | docs/PLAN.md es el MD del proyecto | Memoria entre chats | 2026-09-16 | #2 |
| 015 | Descartar saij-mcp por dependencias sospechosas | httpx2/httpcore2 no son oficiales | 2026-09-16 | #3 |
| 016 | Parser SAIJ nativo en TypeScript, sin Python | Seguridad + portabilidad | 2026-09-16 | #3 |
| 015 | Descartar saij-mcp pip por dependencias sospechosas | httpx2/httpcore2 no oficiales | 2026-09-16 | #3 |
| 016 | SAIJ bloquea requests HTTP directas (WAF) | Confirmado, 403 persistente | 2026-09-16 | #3 |
| 017 | Usar saij-mcp Node.js como referencia de acceso | Ya resolvio el WAF | 2026-09-16 | #3 |
| 018 | Descartar saij-mcp Node.js por señales de alarma | node_modules commiteados, SDK viejo, autor sin verificar | 2026-09-16 | #3 |
| 019 | SAIJ usa sintaxis Lucene en parametro r | titulo:X, texto:X, *:* | 2026-09-16 | #3 |
| 020 | Endpoint real: /busqueda (no /buscar) | Confirmado | 2026-09-16 | #3 |
| 021 | Filtros con pipe pero SAIJ los separa con \u001F | Bug del repo de referencia | 2026-09-16 | #3 |
| 022 | Headers obligatorios: User-Agent + Origin + Referer | Sin ellos, 403 | 2026-09-16 | #3 |
| 023 | Fix modules-actions.ts: usar MODULES en memoria, no DB | Modelo ModuleConfig no existe en schema | 2026-09-16 | #3 |
| 024 | Catalogo de modulos vive en codigo (lib/modules.ts) | No necesita tabla en DB | 2026-09-16 | #3 |
| 025 | Busqueda full-text con tsvector, NO LIKE | Escala a 500K sin degradar | 2026-09-16 | #3 |
| 026 | Ingesta SIN IA, IA solo para analisis puntual | Control de costos | 2026-09-16 | #3 |
| 027 | Tabla JurisprudenceMatterLink para vincular fallos a casos | Relacion N:M limpia | 2026-09-16 | #3 |
| 028 | Cron de ingesta sin IA = $0 de costo operativo | SAIJ es publica y gratuita | 2026-09-16 | #3 |
| 029 | Parser SAIJ convierte numeroSumario a String siempre | SAIJ devuelve Int o String segun caso | 2026-09-16 | #3 |
| 030 | Ingesta por paginas con maxPages configurable | Control de cuota y tiempo | 2026-09-16 | #3 |
| 031 | Dedupe por fingerprint ANTES de insertar | Evita conflictos en createMany | 2026-09-16 | #3 |
| 032 | Cron autonomo a las 04:00 todos los dias | No compite con backups (02:30) ni con otras tareas | 2026-09-16 | #3 |
| 033 | Config de agentes en SystemSetting | Editable sin recompilar | 2026-09-16 | #3 |
| 034 | Deduplicacion por fingerprint antes de insertar | Evita conflictos y ahorra cuota SAIJ | 2026-09-16 | #3 |
| 035 | Panel de agentes movido a /admin/jurisprudence | El estudio no gestiona ingesta, solo consume | 2026-09-16 | #3 |
| 036 | Borrado /agents/jurisprudence | El estudio solo ve la biblioteca, no los agentes | 2026-09-16 | #3 |
| 037 | PDFs de SAIJ NO se descargan, solo metadata + texto | SAIJ bloquea acceso directo (403) | 2026-09-16 | #3 |
| 038 | Modulo IA debe mostrar disclaimer obligatorio | IA puede cometer errores, debe advertirse | 2026-09-16 | #3 |
| 039 | Full-text search con tsvector + trigger + GIN | Escala a 500K sin LIKE | 2026-09-16 | #3 |
| 040 | searchJurisprudence server-side con paginacion | No cargar 500K en el cliente | 2026-09-16 | #3 |
| 041 | getJurisprudenceById para modal detalle | fullText pesado, se carga solo al abrir | 2026-09-16 | #3 |
| 042 | Boton Eliminar solo para super admin | El estudio solo consume | 2026-09-16 | #3 |
| 043 | Button Nueva jurisprudencia para todos | Cargar manualmente es util | 2026-09-16 | #3 |
| 044 | Guards de modulo JURISPRUDENCE en paginas y actions | Sin modulo, no accesible | 2026-09-16 | #3 |
| 045 | Cron de ingesta verifica si algun firm tiene modulo activo | No corre si nadie lo usa | 2026-09-16 | #3 |
| 046 | DialogDescription con asChild cuando tiene divs adentro | Radix renderiza <p>, no permite <div> | 2026-09-16 | #3 |
| 047 | Codigo interno del caso visible en info-panel | Referencia rapida para el usuario | 2026-09-16 | #3 |
| 048 | Info-panel.tsx: encoding corregido (acentos chinos) | Bug de encoding UTF-8 | 2026-09-16 | #3 |
| 049 | Seed traducido del chino al espanol | Codigo legado, no se usaba el chino | 2026-09-16 | #3 |
| 049 | Seed traducido del chino al espanol | Codigo legado, no se usaba el chino | 2026-09-16 | #3 |
| 050 | Reglas de plazos chinas NEUTRALIZADAS en seed | No aplican en Argentina, riesgo legal | 2026-09-16 | #3 |
| 051 | v49-deadline-rules: pendiente reescribir con plazos argentinos | Requiere verificacion legal | 2026-09-16 | #3 |


═══════════════════════════════════════════════════════════════════
SECCIÓN 8 — RIESGOS Y MITIGACIONES
═══════════════════════════════════════════════════════════════════

RIESGO 1 — Romper producción por accidente
  Probabilidad: media. Impacto: alto.
  Mitigación: DB local separada, .env.local, PM2 local.

RIESGO 2 — Fuente de jurisprudencia cambia formato
  Probabilidad: alta. Impacto: medio.
  Mitigación: aislar parser por fuente.

RIESGO 3 — Volumen excede expectativas
  Probabilidad: baja (768G libres). Impacto: bajo.
  Mitigación: monitorear, política de retención.

RIESGO 4 — Agentes IA rompen al integrar biblioteca
  Probabilidad: media. Impacto: alto.
  Mitigación: feature flag, tests antes de activar.

RIESGO 5 — Multi-tenant se rompe al agregar tablas
  Probabilidad: baja. Impacto: alto.
  Mitigación: replicar estructura en TODAS las DBs de estudio.

RIESGO 6 — pgvector no disponible
  Probabilidad: baja. Impacto: bajo.
  Mitigación: es opcional, solo Fase 6.

RIESGO 7 — Token de sesión filtrado en cookies.txt
  Probabilidad: ya ocurrió. Impacto: medio.
  Mitigación: rotar NEXTAUTH_SECRET en server (pendiente Fase 0).
  
RIESGO 8 — SAIJ bloquea requests directas
  Probabilidad: ya ocurrio (403 persistente)
  Impacto: medio (necesitamos proxy o reverse-engineering)
  Mitigacion: usar saij-mcp Node.js que ya resolvio el WAF,
              o replicar su logica de acceso

RIESGO 9 — Repos de terceros con señales de alarma
  Probabilidad: ya ocurrio (saij-mcp pip + saij-mcp node)
  Impacto: alto (seguridad)
  Mitigacion:
    - NUNCA instalar paquetes con dependencias no oficiales
    - NUNCA clonar repos sin verificar autor, historial, estrellas
    - NUNCA ejecutar npm install en repos sospechosos
    - Preferir siempre escribir codigo propio auditable

RIESGO 9 — SAIJ bloquea requests sin headers de navegador
  Probabilidad: alta (ya ocurrio)
  Impacto: bajo (se resuelve con headers correctos)
  Mitigacion: usar User-Agent real + Origin + Referer a saij.gob.ar
  
═══════════════════════════════════════════════════════════════════
SECCIÓN 9 — BACKLOG PRIORIZADO
═══════════════════════════════════════════════════════════════════

ALTA PRIORIDAD (Fase 0)
1. Auditoría de agents/jurisprudence/ existente (Módulo 3)
2. Confirmar proveedor IA (Módulo 3)
3. Identificar proceso node --watch root
4. Eliminar yuandian
5. Detener MariaDB
6. Rotar NEXTAUTH_SECRET en server
7. Preparar entorno local (Módulo 2)

MEDIA PRIORIDAD (Fase 1-3)
8. Extender modelo Jurisprudence
9. Ingestor de SAIJ
10. Búsqueda full-text
11. UI biblioteca unificada

BAJA PRIORIDAD (Fase 4-6)
12. Vinculador causa ↔ jurisprudencia
13. Integración con agentes
14. Búsqueda semántica
15. Ingesta de otras fuentes

PENDIENTES DE LIMPIEZA:
- Traducir seed del chino al espanol (prisma/seed.ts)
- Modelo Jurisprudence: summary cambio de String? a String? @db.Text
- Verificar drift de Firm.enabledModules y WritingTemplate.docxPath

PENDIENTES DETECTADOS:
- Fix: src/server/admin/modules-actions.ts usa prisma.moduleConfig
  que no existe en el schema. Bug preexistente. 4 errores TS2339.
  Ruta: src/server/admin/modules-actions.ts lineas 41, 52, 65, 105
RESUELTO:
- ✅ Bug modules-actions.ts (prisma.moduleConfig) — arreglado con MODULES en memoria
- Pendiente fix: bug modules-actions.ts (prisma.moduleConfig) — RESUELTO
- Pendiente: traducir seed del chino al espanol
- Pendiente: rotar NEXTAUTH_SECRET en server
- Pendiente: /agents/jurisprudence borrado, verificar que no queden refs
PENDIENTES:
- Fix bug modules-actions.ts (prisma.moduleConfig) — ✅ RESUELTO
- Traducir seed del chino al espanol
- Rotar NEXTAUTH_SECRET en server
- Verificar que no queden refs a /agents/jurisprudence
- Probar flujo completo: activar módulo, ver biblioteca, buscar, ver detalle
PENDIENTES:
- Buscar y corregir encoding en TODOS los archivos (hay varios con acentos chinos)
- Traducir seed del chino al espanol
- Rotar NEXTAUTH_SECRET en server
RESUELTO:
- ✅ Seed traducido del chino al espanol

ALTA PRIORIDAD:
- Reescribir prisma/seeds/v49-deadline-rules.ts con plazos argentinos reales
  (CPCCN, CPPN, LCT, LNPA, etc.) con verificacion legal por cada uno.
  Referencias: InfoLEG, CSJN, codigos vigentes.
  Cada regla debe tener verifiedAt (fecha de verificacion legal).

MEDIA PRIORIDAD:
- Buscar y corregir encoding en TODOS los archivos restantes
  (varios con acentos chinos todavia).
═══════════════════════════════════════════════════════════════════
SECCIÓN 10 — PREGUNTAS ABIERTAS
═══════════════════════════════════════════════════════════════════

CRÍTICAS (bloquean Módulo 3)
- ¿Qué hace exactamente src/app/(app)/agents/jurisprudence/?
- ¿Qué muestra jurisprudence-agents-view.tsx?
- ¿Cuántos registros hay en tabla Jurisprudence?
- ¿Jurisprudence está en sidebar del dashboard?
- ¿Jurisprudence está en FirmModuleSubscription / ModuleConfig?
- ¿Qué proveedor IA usa src/lib/ai/client.ts?
- ¿Qué es el proceso node --watch como root?

IMPORTANTES (bloquean Módulo 4)
- ¿Qué campos de Jurisprudence se usan hoy?
- ¿Qué campos faltan para que sea útil?
- ¿Cómo se relaciona Jurisprudence.matterId con Matter hoy?

SECUNDARIAS (no bloquean)
- ¿Qué es el contenedor circulo_app puerto 3002?
- ¿Cuántos estudios hay en producción?
- ¿El repo gabibelt80/lawlink-es es público o privado?
- ¿Los archivos sueltos en raíz (pendientes.txt, todos-chinos.txt,
  seed-contenido.txt, estructura.txt, check-*.ts) son legacy?

═══════════════════════════════════════════════════════════════════
SECCION 11 — ESTADO ACTUAL DEL PLAN
═══════════════════════════════════════════════════════════════════

Ultima actualizacion: 2026-09-16 (cierre Chat #3)
Rama activa: dev (PC Windows)
Rama prod: main (server macserver-M, INTACTA)
Fase actual: FASE 1 (Modelo y datos) — avance significativo
Modulo en curso: jurisprudence

FUNCIONALIDAD ACTUAL (todo en dev):
- Modulo Jurisprudencia con guard de modulo por estudio
- Ingesta desde SAIJ con full-text + parser completo
- Cron autonomo 04:00 diario (configurable desde admin)
- Panel super admin: metricas, control, agentes, logs, import/export
- Biblioteca del estudio: busqueda full-text, filtros, paginacion, modal detalle
- Analisis de caso con IA (READ-ONLY, no escribe code.json)
- Codigo interno visible en info-panel del caso
- Seed traducido del chino; reglas de plazos chinas NEUTRALIZADAS

COMMITS PUSHEADOS EN DEV (14):
- Modelo Jurisprudence extendido + escala 500K
- Cliente SAIJ nativo + parser + ingesta con log
- Server actions (run, search, analyze, link, stats, logs)
- Full-text search (tsvector + trigger + GIN)
- Cron autonomo (ingest-jurisprudence.ts)
- Panel super admin completo
- UI biblioteca con filtros + paginacion + modal
- Analisis de caso con IA (read-only)
- Guards de modulo (paginas + actions + cron)
- Fix codigo interno en info-panel
- Seed traducido + reglas chinas neutralizadas

PENDIENTES ALTA PRIORIDAD:
- Reescribir v49-deadline-rules.ts con plazos argentinos reales
  (requiere verificacion legal)
- Buscar y corregir encoding en TODOS los archivos restantes
- Rotar NEXTAUTH_SECRET en server (por cookies.txt filtrado)

PENDIENTES MEDIA PRIORIDAD:
- Agregar editor de agentes en /admin/jurisprudence (hoy hardcoded)
- IA real en el analisis (hoy solo full-text + reglas)
- Bajar fallos civil/comercial (usuario lo va a hacer)

PENDIENTES BAJA PRIORIDAD:
- pgvector para busqueda semantica
- Deploy a produccion (requiere Fase 0 completa)

ARCHIVOS MODIFICADOS EN DEV (acumulado):
- prisma/schema.prisma + 6 migraciones
- prisma/seed.ts + prisma/seeds/v08-*, v49-*
- src/lib/saij/* (4 archivos)
- src/server/jurisprudence/actions.ts
- src/server/cron/jobs/ingest-jurisprudence.ts
- src/server/cron/scheduler.ts + manual-triggers.ts
- src/server/admin/modules-actions.ts
- src/app/(app)/admin/jurisprudence/_components/jurisprudence-admin-view.tsx
- src/app/(app)/jurisprudence/page.tsx + _components/jurisprudence-view.tsx
- src/app/(app)/agents/_components/agents-dashboard.tsx
- src/app/(app)/matters/[id]/_components/info-panel.tsx
- .gitignore
- cookies.txt (removido)
═══════════════════════════════════════════════════════════════════
SECCION 12 — HISTORIAL DE CHATS
═══════════════════════════════════════════════════════════════════

| # | Tema | Resultado | Archivos tocados |
|---|------|-----------|------------------|
| 1 | Relevamiento + creacion MD v0.1 | MD v0.1 creado | ninguno (solo lectura) |
| 2 | Limpieza cookies, rama dev, PLAN.md | MD v0.2, rama dev creada | .gitignore, docs/PLAN.md, cookies.txt |
| 3 | Auditoria UI jurisprudence + proveedor IA + implementacion completa (5 commits + fixes) | MD v0.3+, cliente SAIJ funcional, ingesta operativa, schema escala 500K | prisma/schema.prisma, prisma/migrations/20260916214127_*, prisma/migrations/20260916225426_*, src/lib/saij/*, src/server/jurisprudence/actions.ts, src/server/admin/modules-actions.ts, src/app/(app)/agents/jurisprudence/_components/jurisprudence-agents-view.tsx |

═══════════════════════════════════════════════════════════════════
SECCIÓN 13 — GLOSARIO
═══════════════════════════════════════════════════════════════════

- Matter: caso/expediente en el sistema
- Firm: estudio jurídico (tenant)
- FirmUser: usuario de un estudio
- Document: archivo dentro de un Matter
- FirmFile: archivo de biblioteca del estudio (sin caso)
- WritingTemplate: plantilla de escritos
- Jurisprudence: fallo judicial
- Intake: ingreso previo a Matter
- Procedure: instancia procesal dentro de un Matter
- code.json: JSON maestro por caso con toda su información
- SAIJ: Sistema Argentino de Información Jurídica
- InfoLEG: base de legislación nacional
- PJN: Poder Judicial de la Nación
- MEV: Mesa de Entradas Virtual
- pgvector: extensión PostgreSQL para embeddings
- ADR: Architecture Decision Record
- MD: Markdown / Mapa Maestro de este documento

═══════════════════════════════════════════════════════════════════
SECCIÓN 14 — REGLAS DE ORO (INVIOLABLES)
═══════════════════════════════════════════════════════════════════

1. code.json por caso: INTOCABLE (salvo Módulo 8 con revisión especial)
2. Flujo Word → txt → Word: INTOCABLE
3. Agentes Editor y Auditor existentes: INTOCABLES en su lógica base
4. Multi-tenant por DB: INTOCABLE
5. Jurisprudence: MODIFICAR, no crear
6. agents/jurisprudence/: MODIFICAR, no crear
7. FirmFile: EXTENDER, no duplicar
8. Todo cambio va a LOCAL primero, nunca a PROD directo
9. Sin Módulo 3 cerrado, no se avanza a Módulo 4
10. Si algo no está en este MD, no se hace
11. NADA lleva acentos en codigo:
    - Nombres de archivos, funciones, variables, tipos, tablas, columnas
    - Rutas, URLs, IDs
    - El contenido de texto que ve el usuario SI lleva acentos (fallos, escritos)
12. Cada hallazgo nuevo se agrega INMEDIATAMENTE al MD con "AGREGA AL MD:"
13. Scripts temporales de admin (create-admin.mjs, etc.) NO se commitean.
    Se crean, se ejecutan, se borran. Nunca quedan en el repo.
14. Las passwords hardcodeadas en scripts NUNCA van a produccion.
    Produccion tiene sus propias credenciales en el server.
═══════════════════════════════════════════════════════════════════
SECCIÓN 15 — FLUJO DE TRABAJO CON IA (entre chats)
═══════════════════════════════════════════════════════════════════

AL INICIO DE CADA CHAT:
1. Pegar este MD completo.
2. Indicar qué se va a hacer en el chat de hoy.
3. La IA lee el MD completo antes de responder.

DURANTE EL CHAT:
- Se trabaja sobre la sección o módulo que corresponda.
- Cada cambio que se decide se documenta.
- Cada comando se da de a UNO, claro y limpio.

AL FINAL DE CADA CHAT:
1. La IA devuelve el MD completo actualizado (nueva versión).
2. Se guarda en docs/PLAN.md (reemplazando el anterior).
3. Se hace commit + push en rama dev.
4. Se cierra el chat.

REGLA:
- Si algo no está en el MD, no se hace.
- Si el MD está desactualizado, el chat pierde contexto.
- El MD es la única memoria entre chats.

═══════════════════════════════════════════════════════════════════
SECCIÓN 16 — FLUJO GIT
═══════════════════════════════════════════════════════════════════

REPOSITORIO: https://github.com/gabibelt80/lawlink-es.git

RAMAS:
- main  → producción (server macserver-M). INTOCABLE desde PC dev.
- dev   → desarrollo (PC Windows). Todos los cambios van acá.

FLUJO DIARIO:
1. git checkout dev
2. git pull origin dev
3. [trabajar]
4. git add [archivos]
5. git commit -m "tipo: descripción"
6. git push origin dev

CONVENCIONES DE COMMIT:
- feat: nueva funcionalidad
- fix: corrección de bug
- docs: documentación
- chore: mantenimiento
- refactor: reestructuración sin cambio funcional

PASAR CAMBIOS A PRODUCCIÓN (cuando estén listos):
1. Verificar que dev funciona bien en local
2. Crear Pull Request de dev → main en GitHub
3. Revisar el PR
4. Mergear
5. En el server: git pull origin main + pm2 reload lawlink

ROLLBACK:
- Si algo sale mal en dev: git reset --hard [commit-anterior]
- Si algo sale mal en main: git revert [commit]

═══════════════════════════════════════════════════════════════════
SECCION 17 — REGLAS DE TRABAJO CON IA
═══════════════════════════════════════════════════════════════════

COMO PEDIR LAS COSAS:
- El usuario pide UN bloque a la vez, no teoria.
- Comandos de a UNO cuando hay riesgo. Bloques juntos cuando es seguro.
- Respuestas cortas, sin relleno, sin repetir lo que ya esta en el MD.
- No asumir que algo existe: verificar antes.
- No hacer auditorias cuando el usuario pide implementar.

LO QUE LA IA NO DEBE HACER:
- No agregar emojis decorativos en codigo.
- No usar acentos en nombres tecnicos.
- No repetir informacion del MD en cada respuesta.
- No frenar el trabajo con preguntas obvias.
- No asumir estado del sistema sin verificar.

CUANDO ALGO SE ROMPE:
- git reset --hard al commit anterior.
- Documentar en el MD que paso.

AL CERRAR UN CHAT:
- Devolver MD completo actualizado a nueva version.
- Indicar seccion modificada y nueva version.
- Recordar hacer commit + push en dev.

═══════════════════════════════════════════════════════════════════
SECCION 18 — VISION DEL MODULO JURISPRUDENCE
═══════════════════════════════════════════════════════════════════

3 CAPAS:

1. AGENTES AUTONOMOS (background)
   - Cron que ejecuta agentes periodicamente
   - Bajan fallos de SAIJ sin intervencion humana
   - Config en SystemSetting (jurisprudenceAgentConfig)
   - UI: panel en /agents/jurisprudence con estado

2. BIBLIOTECA DE JURISPRUDENCIA
   - Vista /jurisprudence con lista de fallos
   - Busqueda, filtros, tags
   - Boton "Vincular a caso" por fallo
   - Ya existe la base, hay que pulirla

3. AGENTE POR CASO (interactivo)
   - Input: codigo del caso (ej: JD-2006-0002)
   - IA lee el code.json del caso
   - Extrae contexto (materia, causa, hechos, palabras clave)
   - Busca en biblioteca local + SAIJ
   - Puntua relevancia
   - Muestra informe con fallos aplicables
   - Boton "Vincular al caso" agrega al code.json

ORDEN DE CONSTRUCCION:
- Commit 5: Biblioteca UI completa (pulir lo existente)
- Commit 6: Agente autonomo (cron + config)
- Commit 7: Agente por caso (el magico)


CONTROL DE COSTOS:

- SAIJ: $0 (API publica sin auth) [citation:7][citation:8]
- Guardar en DB: $0
- Busqueda full-text: $0 (PostgreSQL)

UNICO COSTO: IA que analiza fallos

ESTRATEGIA:
1. Agente autonomo (cron) baja fallos SIN IA → $0
2. Biblioteca almacena y busca full-text → $0
3. Agente por caso (cuando usuario pide) usa IA con presupuesto limitado

CONTROLES DE GASTO:
- llm-hard-cap o gram-middleware: budget diario/mensual en USD [citation:2][citation:15]
- OpenAI hard limit: bloquea al llegar al tope [citation:3]
- Auto-downgrade a modelo mas barato si se acerca al limite [citation:2]

═══════════════════════════════════════════════════════════════════
SECCION 18 — ARQUITECTURA DE JURISPRUDENCE (para 500K+)
═══════════════════════════════════════════════════════════════════

4 CAPAS:

1. ALMACENAMIENTO CRUDO
   - PostgreSQL tabla Jurisprudence
   - fullText completo + metadata + JSONB descriptors
   - fingerprint unico para deduplicar

2. BUSQUEDA FULL-TEXT
   - PostgreSQL tsvector + GIN index
   - Config 'spanish' (soporta acentos, stemming)
   - Ranking con ts_rank
   - $0 de costo, sin dependencias

3. BUSQUEDA SEMANTICA (futura opcional)
   - pgvector para embeddings
   - Se llena en background

4. VINCULACION CON CASOS
   - Tabla JurisprudenceMatterLink (N:M)
   - Score de relevancia
   - Se agrega al code.json del caso

MODELOS NUEVOS:
- JurisprudenceMatterLink (relacion fallo-caso)
- JurisprudenceIngestLog (historial de ingesta)

CAMPOS NUEVOS en Jurisprudence:
- searchVector (tsvector, con trigger)
- descriptors (Json)
- citesUuids (String[])
- numeroSumario, fechaUmod

ESTRUCTURA DE CARPETAS:
storage/jurisprudence/YYYY/MM/   → por fecha
storage/jurisprudence/PDFs/ab/   → por hash prefix

REGLAS DE ESCALA:
- tsvector, NO LIKE
- Indices en TODOS los campos de filtro
- Paginacion obligatoria (LIMIT 50)
- JSONB para datos flexibles
- Dedupe con fingerprint + hash
- createMany en lotes de 100-500

FLUJO SIN IA:
Usuario abre caso → sistema lee code.json → construye query con reglas
→ busca en full-text → ordena por ranking → muestra top 20
→ usuario elige → se vincula al caso

IA SOLO SE USA:
- Si el usuario pide "explicame por que aplica"
- 1 llamada por fallo, nunca por busqueda
- Con presupuesto limitado

═══════════════════════════════════════════════════════════════════
FIN DEL MAPA MAESTRO — v0.2
═══════════════════════════════════════════════════════════════════
