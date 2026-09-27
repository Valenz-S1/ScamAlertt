# ScamAlert — Propuesta

## Sistema de detección y prevención de estafas digitales

### 1. Problemática

Las estafas mediante WhatsApp, SMS y correo electrónico son un problema frecuente
para usuarios y empresas. Entre las más comunes se encuentran mensajes falsos de
paqueterías, bancos, familiares, promociones, premios y enlaces que buscan obtener
información personal o empresarial. Este problema afecta especialmente a personas
mayores o con poca experiencia digital, quienes pueden tener dificultades para
identificar señales de fraude. En las empresas, un empleado puede recibir correos
de phishing o mensajes fraudulentos que, al abrir un enlace o proporcionar
información, pueden poner en riesgo los datos de la organización.

### 2. Solución

Se propone desarrollar ScamAlert, una aplicación móvil que permita analizar
mensajes, correos electrónicos o capturas de pantalla para identificar posibles
estafas. El usuario podrá introducir el texto de un mensaje o cargar una captura
de pantalla; el sistema lo comparará con reportes anteriores.

Resultado mediante señales:

- 🟢 Verde: no se encontraron suficientes características sospechosas.
- 🟡 Amarilla: características sospechosas, se recomienda verificar.
- 🔴 Roja: características asociadas con estafas o múltiples reportes similares.

### 3. Funcionamiento

El sistema analiza palabras utilizadas, estructura del mensaje, enlaces, remitente
y similitud con otros reportes. Ejemplo:

> "Su paquete está retenido. Realice el pago para completar la entrega."

Con 327 reportes similares, la app mostraría:

- Señal roja: posible estafa detectada
- Tipo: paquetería falsa
- Reportes similares: 327
- Actividad reciente: alta
- Recomendación: no abrir enlaces ni dar información personal

### 4. Componentes y tecnologías consideradas

- **Frontend:** React Native, TypeScript, Flutter, Dart, Kotlin, Jetpack Compose
- **Backend:** Node.js, Express.js, Python, FastAPI, Java, Spring Boot
- **Base de datos:** Firebase Firestore, PostgreSQL, MySQL, MongoDB
- **Procesamiento de texto:** Python, NLP, spaCy, NLTK, Hugging Face Transformers,
  Google Cloud Natural Language
- **Control de versiones:** Git, GitHub, GitLab

*(Stack elegido para el prototipo: ver tabla en el README principal.)*

### 5. Alcance del prototipo

- Analizar mensajes sospechosos (texto manual o captura + OCR)
- Comparar mensajes con reportes existentes, identificar similares
- Clasificar tipo de estafa y nivel de riesgo
- Mostrar reportes similares, generar alertas
- Historial de análisis y estadísticas básicas

Dos enfoques: prevención para usuarios particulares (especialmente personas
mayores) y apoyo a la seguridad empresarial.

### 6. Implementación de IA

1. **Mensaje sospechoso:** modelo de NLP / servicio de IA que estima probabilidad
   de estafa.
2. **Comparación con reportes:** el mensaje se convierte en un vector (embedding)
   y se compara contra mensajes ya reportados.
3. **OCR:** Tesseract o Google Cloud Vision extraen el texto de las capturas.
4. **Reglas adicionales:** enlaces acortados, remitentes desconocidos, mensajes
   que exigen actuar de inmediato.
5. **Mejora con el uso:** la confirmación del usuario (era/no era estafa) se
   guarda para afinar el sistema con el tiempo.

### 7. Uso de Claude y su API

Claude (Anthropic) no se entrena desde cero: se le dan instrucciones claras
(ingeniería de prompts) y ejemplos de cómo responder.

**Flujo:** cada mensaje o captura se envía a la API de Claude junto con
instrucciones para que actúe como analizador de estafas, devolviendo si es
sospechoso, el tipo de estafa y el nivel de riesgo (bajo/medio/alto).

**Ejemplo de instrucción de sistema:**
"Eres un asistente que detecta estafas digitales. Analiza el siguiente mensaje
y responde si es una posible estafa, indicando el tipo y el nivel de riesgo
(bajo, medio, alto)."

**Ventajas:** no requiere entrenar un modelo propio, se puede usar de inmediato,
se ajusta cambiando las instrucciones, y puede explicar su razonamiento.

**Aclaración:** Claude no se "entrena" con los datos del proyecto como un modelo
tradicional; lo que se hace es dar instrucciones y ejemplos en cada llamada
a la API.
