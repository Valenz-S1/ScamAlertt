# ScamAlert

Sistema de detección y prevención de estafas digitales (WhatsApp, SMS, correo).
Analiza mensajes o capturas de pantalla y devuelve un nivel de riesgo (verde / amarillo / rojo).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend (app móvil) | React Native + Expo + TypeScript |
| Backend | Python + FastAPI |
| Base de datos | PostgreSQL |
| IA / NLP | Claude API (Anthropic) |
| OCR | Tesseract OCR / Google Cloud Vision |
| Contenedores | Docker + Docker Compose |
| Control de versiones | Git + GitHub |

## Estructura del repositorio

```
scamalert/
├── backend/          # API en FastAPI
│   ├── app/
│   │   ├── api/          # routers/endpoints
│   │   ├── core/         # configuración, settings
│   │   ├── models/        # modelos ORM (SQLAlchemy)
│   │   ├── schemas/       # esquemas Pydantic
│   │   ├── services/      # lógica: Claude, OCR, comparación de reportes
│   │   ├── db/            # conexión a la base de datos
│   │   └── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/         # App en React Native (Expo)
│   ├── src/
│   │   ├── screens/       # pantallas de la app
│   │   ├── components/    # componentes reutilizables
│   │   ├── services/      # llamadas a la API del backend
│   │   ├── types/         # tipos TypeScript
│   │   └── navigation/    # navegación entre pantallas
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── propuesta.md   # propuesta del proyecto
├── docker-compose.yml
└── .gitignore
```

## Cómo levantar el proyecto

### Backend + base de datos (Docker)

```bash
docker compose up --build
```

Esto levanta:
- `backend` en `http://localhost:8000`
- `db` (PostgreSQL) en el puerto `5432`

### Frontend (Expo)

```bash
cd frontend
npm install
npx expo start
```

Escanea el QR con la app Expo Go, o presiona `a` / `i` para abrir en emulador Android/iOS.

## Variables de entorno

Copia `backend/.env.example` a `backend/.env` y completa:

```
ANTHROPIC_API_KEY=tu_api_key_aqui
DATABASE_URL=postgresql://scamalert:scamalert@db:5432/scamalert
```

**Nunca subas tu `.env` real al repositorio** (ya está en `.gitignore`).

## Próximos pasos sugeridos

- [ ] Definir modelos de datos (Usuario, Reporte, Análisis)
- [ ] Endpoint `POST /analyze` (texto)
- [ ] Endpoint `POST /analyze/image` (captura + OCR)
- [ ] Integración con Claude API para clasificación de riesgo
- [ ] Comparación de embeddings contra reportes previos
- [ ] Pantallas: Home, Analizar mensaje, Resultado, Historial
