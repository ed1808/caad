# Manual de Usuario de CAAD (Computer Assisted API Design)

> **Versión del Manual:** 1.0  
> **Versión de la Aplicación:** CAAD v0.1.0 (MVP)  
> **Audiencia:** Diseñadores de producto, analistas de negocio, desarrolladores backend/frontend, arquitectos de software y líderes técnicos.

---

## Tabla de Contenidos

1. [¿Qué es CAAD y para qué sirve?](#1-qué-es-caad-y-para-qué-sirve)
   - [La analogía del plano arquitectónico](#11-la-analogía-del-plano-arquitectónico)
   - [¿Para quién está diseñado?](#12-para-quién-está-diseñado)
   - [Principios esenciales: Local-First y Asistencia](#13-principios-esenciales-local-first-y-asistencia)
2. [Glosario Rápido: Puente entre negocio y tecnología](#2-glosario-rápido-puente-entre-negocio-y-tecnología)
3. [Primeros Pasos con la Interfaz](#3-primeros-pasos-con-la-interfaz)
   - [Estructura visual de la pantalla](#31-estructura-visual-de-la-pantalla)
   - [Barra de Estado y Semáforo de Guardado](#32-barra-de-estado-y-semáforo-de-guardado)
   - [Personalización y Temas Visuales](#33-personalización-y-temas-visuales)
4. [Flujo de Trabajo Paso a Paso](#4-flujo-de-trabajo-paso-a-paso)
   - [Paso 1: Crear o abrir un proyecto](#paso-1-crear-o-abrir-un-proyecto)
   - [Paso 2: Definir los metadatos de la API](#paso-2-definir-los-metadatos-de-la-api)
   - [Paso 3: Modelar los datos (Esquemas / Schemas)](#paso-3-modelar-los-datos-esquemas--schemas)
   - [Paso 4: Diseñar los endpoints (Operaciones REST)](#paso-4-diseñar-los-endpoints-operaciones-rest)
   - [Paso 5: Auditar con el Asistente de Validación en tiempo real](#paso-5-auditar-con-el-asistente-de-validación-en-tiempo-real)
   - [Paso 6: Probar la API sin backend (Documentación y Consola Mock)](#paso-6-probar-la-api-sin-backend-documentación-y-consola-mock)
   - [Paso 7: Exportar e Importar contratos (OpenAPI 3.1)](#paso-7-exportar-e-importar-contratos-openapi-31)
5. [Guía de Diagnósticos y Resolución de Problemas](#5-guía-de-diagnósticos-y-resolución-de-problemas)
   - [Errores Estructurales (`STRUCT-*`)](#51-errores-estructurales-struct-)
   - [Advertencias de Consistencia (`CONS-*`)](#52-advertencias-de-consistencia-cons-)
   - [Sugerencias de Diseño (`SUGG-*`)](#53-sugerencias-de-diseño-sugg-)
6. [Detalles Técnicos para Desarrolladores y Arquitectos](#6-detalles-técnicos-para-desarrolladores-y-arquitectos)
   - [Arquitectura Local-First y Almacenamiento](#61-arquitectura-local-first-y-almacenamiento)
   - [Autoguardado debounced y seguridad de datos](#62-autoguardado-debounced-y-seguridad-de-datos)
   - [Compatibilidad con OpenAPI 3.1 y JSON Schema](#63-compatibilidad-con-openapi-31-y-json-schema)
7. [Preguntas Frecuentes (FAQ)](#7-preguntas-frecuentes-faq)

---

## 1. ¿Qué es CAAD y para qué sirve?

**CAAD** (*Computer Assisted API Design*) es una aplicación de escritorio diseñada para modelar, revisar, validar y exportar contratos de APIs HTTP REST utilizando el estándar internacional **OpenAPI 3.1**.

### 1.1 La analogía del plano arquitectónico

> **Para el público no técnico:**  
> Imagine que va a construir un edificio. Nadie contrata albañiles ni vierte cemento sin antes tener un **plano arquitectónico** aprobado. En el software ocurre lo mismo: antes de que los programadores escriban miles de líneas de código en el servidor (backend) y en las pantallas móviles o web (frontend), deben ponerse de acuerdo en **cómo se comunicarán**.  
>  
> Ese acuerdo se llama **Contrato de API**. CAAD es la herramienta de dibujo arquitectónico que ayuda a diseñar ese contrato de forma visual, evitando que durante la construcción se descubra que una puerta no encaja o que falta una tubería.

### 1.2 ¿Para quién está diseñado?

* **Diseñadores de Producto y Analistas de Negocio:** Pueden definir qué información debe viajar entre pantallas y servidores sin necesidad de saber programar.
* **Desarrolladores Backend:** Pueden diseñar y estructurar endpoints, validaciones y modelos antes de codificar la base de datos o los controladores.
* **Desarrolladores Frontend / Móviles:** Cuentan con un contrato interactivo y una consola de simulación de datos (Mock) para comenzar a construir interfaces de usuario de inmediato, sin esperar a que el backend esté listo.
* **Arquitectos de Software:** Supervisan la coherencia técnica, la nomenclatura y las buenas prácticas de toda la organización.

### 1.3 Principios esenciales: Local-First y Asistencia

* **100% Local y Privado (*Local-First*):** Los proyectos se guardan en su propia computadora en una base de datos SQLite integrada. CAAD no requiere cuentas, no envía datos a la nube ni recopila telemetría.
* **Diseño Asistido y Determinista:** Cuenta con un motor de validación en Rust que analiza su contrato en segundo plano mientras usted diseña, alertando sobre incoherencias antes de que se conviertan en errores de producción.
* **Sin Pérdida Silenciosa (*Non-Silent Loss*):** Al importar o exportar especificaciones OpenAPI, CAAD siempre le advertirá con transparencia si algún elemento excede el subconjunto soportado, evitando sorpresas.

---

## 2. Glosario Rápido: Puente entre negocio y tecnología

| Término | Explicación No Técnica (Analogía) | Definición Técnica |
|---|---|---|
| **API** | Menú de un restaurante donde el cliente (frontend) elige qué pedir y la cocina (backend) prepara la orden. | *Application Programming Interface*. Conjunto de reglas y formatos para comunicación entre sistemas. |
| **Endpoint / Ruta** | La dirección física de ventanilla o buzón donde se hace una solicitud específica (ej. `/vehiculos`). | URI de destino en el servidor HTTP que procesa un recurso determinado. |
| **Método HTTP** | La intención del cliente: `GET` (Consultar/Ver), `POST` (Crear nuevo), `PUT` (Reemplazar todo), `PATCH` (Modificar una parte), `DELETE` (Eliminar). | Verbo de la petición HTTP según RFC 9110 que define la semántica de la operación. |
| **Esquema (Schema)** | La ficha técnica o formulario vacío que define qué campos componen un elemento (ej. una "Factura" tiene fecha, monto y cliente). | Modelo de datos tipado bajo el estándar JSON Schema (OpenAPI 3.1) con validaciones y restricciones. |
| **Parámetro** | Datos pequeños que afinan la petición (ej. "el auto con placa ABC", o "mostrar solo los primeros 10"). | Variable de entrada clasificada por ubicación: `path` (en URL), `query` (cadena de búsqueda), `header` (cabecera) o `cookie`. |
| **Request Body** | El paquete o paquete de encomienda con datos completos que se envía al servidor para crear o actualizar algo. | Cuerpo de la solicitud HTTP con un tipo de contenido específico (usualmente `application/json`). |
| **Respuesta (Response)** | La contestación del servidor, que incluye un semáforo (Código HTTP) y los datos solicitados o el motivo del error. | Mensaje HTTP retornado con código de estado, cabeceras y esquema de contenido. |
| **Código HTTP (Status Code)** | El semáforo de respuesta: `200/201` (Todo salió bien), `400` (El cliente envió datos mal), `404` (No se encontró), `500` (Fallo interno). | Código numérico estándar de 3 dígitos (RFC 9110) que resume el resultado de la petición. |
| **OpenAPI 3.1** | El estándar internacional en formato texto (JSON/YAML) para describir contratos de APIs de forma legible para humanos y máquinas. | Especificación formal interoperable para servicios REST, alineada con JSON Schema 2020-12. |
| **$ref (Referencia)** | Un enlace reutilizable. En lugar de copiar y pegar la estructura de "Cliente" en 20 lugares, se hace referencia a la ficha original. | Puntero JSON Pointer URI (`#/components/schemas/Cliente`) para composición modular de datos. |

---

## 3. Primeros Pasos con la Interfaz

### 3.1 Estructura visual de la pantalla

La aplicación está dividida en cuatro zonas principales diseñadas para una navegación rápida:

```
+-----------------------------------------------------------------------------------+
|  [CAAD LOGO]  PROYECTO: Taller Mecánico API   [GUARDADO] [EXPORTAR] [IMPORTAR]    | <- Header
+--------------+--------------------------------------------------------------------+
|  [Proyectos] |                                                                    |
|  [Metadatos] |                                                                    |
|  [Esquemas]  |                     ÁREA DE TRABAJO PRINCIPAL                      |
|  [Operación] |               (Formularios, Listas y Editores)                     |
|  [Diagnóst.] |                                                                    |
|  [Document.] |                                                                    |
|  [Ajustes]   |                                                                    |
|  (Sidebar)   |                                                                    |
+--------------+--------------------------------------------------------------------+
|  ● Conectado a Core Rust  |  0 Errores  |  1 Advertencia  |  v0.1.0               | <- StatusBar
+-----------------------------------------------------------------------------------+
```

1. **Barra Lateral (Sidebar):** Permite saltar entre las vistas clave:
   - **Proyectos:** Creación, apertura y eliminación de contratos.
   - **Metadatos:** Información general (título, versión, servidores).
   - **Esquemas:** Modelado visual de las estructuras de datos.
   - **Operaciones:** Definición de endpoints REST y sus métodos.
   - **Validación:** Panel de auditoría de errores con navegación en un clic.
   - **Documentación:** Vista previa navegable y consola Mock de pruebas.
   - **Ajustes:** Personalización visual y preferencias de autoguardado.
2. **Cabecera (Header):** Muestra el proyecto activo, acceso rápido a modales de Importación/Exportación OpenAPI y el estado de persistencia.
3. **Área de Trabajo:** Donde se editan los formularios contextuales con diseño de alto contraste.
4. **Barra de Estado (StatusBar):** Informa en tiempo real sobre la conexión con el motor en Rust, el total de problemas detectados y la versión del sistema.

### 3.2 Barra de Estado y Semáforo de Guardado

En la esquina superior derecha del encabezado se encuentra el indicador de persistencia:

* <span style="color:#d4ff00; font-weight:bold;">GUARDANDO...</span>: CAAD detectó cambios y está asegurando la información en SQLite en segundo plano.
* <span style="color:#00e5ff; font-weight:bold;">GUARDADO (SQLITE)</span>: Todos los cambios están respaldados de forma segura y transaccional en el disco.
* <span style="color:#ff1744; font-weight:bold;">ERROR AL GUARDAR</span>: Se presentó un problema en disco. El sistema mantendrá los datos en memoria y le permitirá reintentar manualmente.

### 3.3 Personalización y Temas Visuales

Desde la sección **Ajustes (Settings)** puede alternar entre tres esquemas de color:
* **Cyber Dark (Por defecto):** Fondo oscuro de alto contraste, ideal para programar de noche con mínimo cansancio visual.
* **Parchment Light:** Fondo claro arquitectónico de alta legibilidad en ambientes muy iluminados.
* **Tactical Amber:** Modo terminal industrial retro-monocromático de inspiración táctica.

---

## 4. Flujo de Trabajo Paso a Paso

### Paso 1: Crear o abrir un proyecto

Al abrir CAAD se presenta la vista de **Proyectos**. Tiene tres opciones:

1. **Crear un nuevo proyecto:** Haga clic en **"+ NUEVO PROYECTO"**, escriba un nombre descriptivo (ej. `Sistema de Facturación`) y una descripción opcional.
2. **Cargar el proyecto de demostración (*Workshop API*):** Si es su primera vez en CAAD, haga clic en el botón destacado **"CARGAR DEMO"**. Esto creará un contrato completo de un taller mecánico con vehículos, órdenes de trabajo y validaciones preconfiguradas.
3. **Importar una API existente:** Si ya cuenta con un archivo OpenAPI en formato JSON o YAML, haga clic en **"IMPORTAR OPENAPI"** (ver Paso 7).

---

### Paso 2: Definir los metadatos de la API

Haga clic en la pestaña **Metadatos** de la barra lateral:
1. **Título del Contrato:** Nombre oficial con el que se identificará la API (ej. `Fleet Management API`).
2. **Versión SemVer:** Versión del contrato (ej. `1.0.0`). Siga la regla `Mayor.Menor.Parche`.
3. **Descripción:** Resumen del alcance y propósito del servicio. Admite explicaciones detalladas.
4. **Servidores (Endpoints base):** Indique las URLs donde se podrá consultar la API (ej. `https://api.empresa.com/v1` para Producción y `http://localhost:3000/v1` para Desarrollo local).

---

### Paso 3: Modelar los datos (Esquemas / Schemas)

Los esquemas son las piezas reutilizables de su sistema. En la sección **Esquemas**:

#### Creación de un nuevo modelo
1. Presione **"+ NUEVO ESQUEMA"**.
2. Indique un nombre en formato `PascalCase` (ej. `Cliente`, `Vehiculo`, `OrdenTrabajo`).
3. Seleccione el tipo base (normalmente `object`).

#### Agregado y configuración de atributos (Propiedades)
En el panel lateral derecho del esquema seleccionado:
1. Ingrese el nombre del campo en la casilla inferior y presione **"+ AGREGAR"** (ej. `id`, `nombre`, `correo`, `creado_en`).
2. Para cada campo configure:
   * **Tipo de dato:** `string` (texto), `integer` (número entero), `number` (número con decimales), `boolean` (verdadero/falso), `array` (lista) o `$ref` (referencia a otro esquema).
   * **Obligatorio (`Req`):** Marque la casilla si este campo no puede faltar jamás al crear o retornar el objeto.
   * **Formato Especial:** Si es `string`, puede elegir `uuid`, `date-time`, `date`, `email` o `uri`. Esto permite que las validaciones y los mocks sean ultra-realistas.
   * **Nulabilidad (`Nullable`):** En OpenAPI 3.1, indique si el campo acepta explícitamente valores `null`.
   * **Restricciones:** Configure valores mínimos/máximos para números o longitudes para cadenas de texto.
   * **Valores Permitidos (`Enum`):** Si un estado solo puede ser uno de tres valores (ej. `PENDIENTE`, `EN_PROCESO`, `COMPLETADO`), defínalos como lista de opciones fijas.

#### Refactorización y eliminación segura
* **Renombrar Esquema:** Haga clic en el botón de lápiz. Si cambia el nombre de `Vehiculo` a `Automovil`, CAAD **actualizará automáticamente todas las referencias `$ref`** en endpoints y otros esquemas sin romper nada.
* **Eliminación Protegida:** Si intenta borrar un esquema que está siendo usado por una operación, CAAD le advertirá detallando exactamente en qué endpoints está en uso para evitar referencias rotas.

---

### Paso 4: Diseñar los endpoints (Operaciones REST)

Vaya a la vista de **Operaciones**. Aquí se define cada acción que la API puede realizar.

#### Crear una operación
1. Haga clic en **"+ NUEVA OPERACIÓN"**.
2. Especifique:
   * **Método HTTP:** Seleccione la acción (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
   * **Ruta (Path):** La dirección que inicia con barra diagonal `/` (ej. `/vehiculos`, `/vehiculos/{id}`).
3. Presione **"CREAR OPERACIÓN"**.

#### Detallar la operación
* **Identificador único (`operationId`):** Nombre técnico de la función (ej. `obtenerVehiculoPorId`, `crearOrden`).
* **Resumen y Descripción:** Explique qué hace el endpoint en lenguaje claro para el equipo.
* **Etiquetas (Tags):** Agrupe sus operaciones por recurso (ej. `Vehículos`, `Facturas`, `Reportes`).

#### Configurar Parámetros de Entrada
En la sección **Parámetros**:
* **Ubicación:**
  * `path`: Variable dentro de la URL (ej. `/vehiculos/{id}`). *Nota: Todo parámetro en ruta es obligatoriamente requerido por estándar OpenAPI.*
  * `query`: Filtros o paginación en la URL (ej. `?estado=ACTIVO&limite=20`).
  * `header`: Cabeceras especiales (ej. `X-Tenant-Id`).
  * `cookie`: Valores de sesión.
* Defina el nombre, tipo de dato y descripción.

#### Configurar el Cuerpo de la Petición (*Request Body*)
Para operaciones como `POST` o `PUT`:
1. Active la casilla de **Request Body**.
2. Seleccione el tipo de contenido (usualmente `application/json`).
3. Elija el esquema que debe enviar el cliente (ej. vincular con `$ref: #/components/schemas/VehiculoNuevo`).

#### Configurar las Respuestas HTTP
Toda buena API debe explicar qué responde en caso de éxito y en caso de error:
1. En la tabla de respuestas, agregue los códigos necesarios:
   * `200 OK` o `201 Created` para el escenario exitoso, vinculando el esquema de datos retornado.
   * `400 Bad Request` explicando qué ocurre si los datos enviados son incorrectos.
   * `404 Not Found` si se buscó un identificador inexistente.
   * `500 Internal Error` o `default` para contemplar fallos del servidor.
2. Ingrese una descripción clara para cada respuesta.

---

### Paso 5: Auditar con el Asistente de Validación en tiempo real

A diferencia de los editores de texto tradicionales, CAAD no espera a que termine de programar para decirle qué está mal.

1. Abra la vista **Validación** (o haga clic en el contador de diagnósticos en el encabezado).
2. El sistema analiza automáticamente el contrato aplicando 16 reglas deterministas divididas en:
   * **Errores Estructurales (Rojo):** Violaciones que impiden que el contrato funcione (ej. un parámetro `{id}` en la URL que olvidó declarar en la lista de parámetros, o una referencia a un esquema que no existe).
   * **Advertencias de Consistencia (Amarillo):** Buenas prácticas de arquitectura que faltan (ej. una lista que no tiene paginación, o un endpoint que no contempló la respuesta `404 Not Found`).
   * **Sugerencias de Estilo (Azul/Violeta):** Recomendaciones de nombres y organización (ej. usar `kebab-case` en URLs o clasificar con etiquetas).
3. **Navegación asistida en 1 clic:** Haga clic sobre cualquier tarjeta de diagnóstico. CAAD lo llevará **directamente al campo exacto** de la pantalla correspondiente para que pueda resolver la observación al instante.

---

### Paso 6: Probar la API sin backend (Documentación y Consola Mock)

¿Desea validar cómo se verá la API y probarla antes de implementarla? Abra la vista **Documentación**.

#### Explorador Interactivo
* Visualice la documentación completa renderizada en vivo con colores según el método HTTP.
* Filtre por etiquetas o busque cualquier palabra clave en la barra superior.
* Despliegue cualquier endpoint para ver sus parámetros, cabeceras y modelos de datos.

#### Consola de Simulación (*Mock Console*)
En cualquier operación, haga clic en el botón **"PROBAR EN MOCK CONSOLE"**:
1. CAAD generará automáticamente datos de prueba creíbles a partir de sus esquemas (UUIDs reales, fechas ISO, correos electrónicos válidos y números dentro de los rangos definidos).
2. Puede modificar los parámetros y el JSON de entrada como si fuera una herramienta de pruebas.
3. Elija el código de respuesta que desea simular (ej. `200 OK` o `400 Bad Request`).
4. Presione **"ENVIAR PETICIÓN SIMULADA"**.
5. Recibirá una respuesta con simulación de latencia de red (`~30 ms`), cabeceras HTTP y el cuerpo de respuesta generado según el contrato.
6. Copie los ejemplos con un clic para compartirlos con el equipo de frontend.

---

### Paso 7: Exportar e Importar contratos (OpenAPI 3.1)

#### Exportar el contrato
1. En la esquina superior derecha, presione el botón **"EXPORTAR"**.
2. Elija entre formato **YAML** (más legible para humanos) o **JSON** (ideal para herramientas automatizadas).
3. El modal verifica la validez del contrato y le ofrece:
   * **Copiar al portapapeles:** Para pegarlo en chats, pull requests o wikis.
   * **Descargar archivo:** Guarda el archivo `.yaml` o `.json` en su disco.

#### Importar un contrato existente
1. Haga clic en **"IMPORTAR OPENAPI"**.
2. Puede arrastrar un archivo desde su explorador o pegar el texto directamente.
3. Presione **"ANALIZAR ESPECIFICACIÓN"**.
4. **Reporte de No Pérdida Silenciosa (*Non-Silent Loss*):** CAAD examina el archivo y le muestra una auditoría previa indicando cuántas operaciones y esquemas se importarán y si hay algún elemento no soportado por el subconjunto actual.
5. Elija si desea crear un **Nuevo Proyecto** o **Reemplazar el proyecto activo**, y confirme la importación.

---

## 5. Guía de Diagnósticos y Resolución de Problemas

Esta tabla permite comprender rápidamente qué significa cada alerta del asistente y cómo resolverla:

### 5.1 Errores Estructurales (`STRUCT-*`)
*Deben corregirse para que el contrato sea formalmente válido.*

| Código | Qué significa | Por qué ocurre | Cómo resolverlo en CAAD |
|---|---|---|---|
| **`STRUCT-001`** | Metadatos básicos requeridos | Falta el título o la versión de la API. | Vaya a **Metadatos** y escriba el título y versión (ej. `1.0.0`). |
| **`STRUCT-002`** | Operación duplicada | Existen dos operaciones con el mismo método y ruta (ej. dos `GET /usuarios`). | Cambie la ruta o el método HTTP de una de ellas. |
| **`STRUCT-003`** | Referencia interna no resuelta | Un campo apunta a un `$ref` de un esquema que fue borrado o no existe. | Cree el esquema faltante en **Esquemas** o cambie el tipo a primitivo. |
| **`STRUCT-004`** | Parámetro de ruta ausente en URL | Creó un parámetro de tipo `path` llamado `id`, pero la ruta dice `/usuarios` sin `{id}`. | Agregue `{id}` a la ruta (ej. `/usuarios/{id}`) o cambie el parámetro a `query`. |
| **`STRUCT-005`** | Inconsistencia en variables de ruta | La ruta dice `/usuarios/{id}` pero no creó el parámetro `id`, o lo puso como opcional. | Agregue el parámetro `id` en ubicación `path` y asegúrese de marcarlo como obligatorio. |
| **`STRUCT-006`** | `operationId` duplicado | Dos endpoints tienen exactamente el mismo identificador de función. | Asigne un `operationId` único a cada operación (ej. `obtenerUsuario` y `listarUsuarios`). |
| **`STRUCT-007`** | Esquema inválido | Un esquema o propiedad tiene el nombre vacío o no tiene tipo asignado. | Asígnele un nombre válido y elija un tipo (`string`, `object`, etc.). |
| **`STRUCT-008`** | Violación en respuestas HTTP | Una operación no tiene ninguna respuesta declarada, o la respuesta no tiene descripción. | Agregue al menos una respuesta (ej. `200`) y redacte su descripción. |

---

### 5.2 Advertencias de Consistencia (`CONS-*`)
*Indican vacíos o posibles defectos de diseño en el servicio.*

| Código | Qué significa | Recomendación |
|---|---|---|
| **`CONS-002`** | Formato de ruta anómalo | La ruta no inicia con `/`, tiene dobles barras `//` o termina en barra final `/`. Normalice la sintaxis a `/recurso`. |
| **`CONS-003`** | Esquema huérfano / no utilizado | Creó un esquema en **Esquemas** que no está siendo usado por ningún endpoint ni por otro esquema. Úselo o bórrelo si ya no es necesario. |
| **`CONS-004`** | Colección sin paginación | Un `GET` retorna una lista/array de elementos pero no incluye parámetros para paginar (`limit`, `offset`, `page`). Agregue parámetros de consulta para evitar saturar el servidor. |
| **`CONS-005`** | Operación sin documentación | El endpoint no tiene ni resumen ni descripción. Redacte una breve explicación de para qué sirve. |
| **`CONS-006`** | Falta respuesta de error habitual | Un endpoint con `{id}` en ruta no tiene respuesta `404 Not Found`, o un endpoint con `Request Body` no tiene respuesta `400 Bad Request`. Documente qué errores puede esperar el cliente. |

---

### 5.3 Sugerencias de Diseño (`SUGG-*`)
*Buenas prácticas de la industria para APIs profesionales y limpias.*

| Código | Qué significa | Recomendación |
|---|---|---|
| **`SUGG-001`** | Convención de nombres REST | Se sugiere usar `kebab-case` en minúsculas para rutas (ej. `/ordenes-compra` en vez de `/ordenes_Compra`) y `PascalCase` para esquemas (ej. `OrdenCompra`). |
| **`SUGG-002`** | Manejo de errores de servidor | El endpoint no contempla respuesta `500` o `default`. Añada una respuesta `500` para documentar caídas inesperadas del servicio. |
| **`SUGG-003`** | Operación sin etiquetas | La operación no tiene ningún `tag`. Asígnele una etiqueta para que la documentación se organice en secciones claras. |

---

## 6. Detalles Técnicos para Desarrolladores y Arquitectos

Para perfiles técnicos que deseen entender las entrañas de CAAD:

### 6.1 Arquitectura Local-First y Almacenamiento
* **Núcleo Nativo:** Desarrollado en **Rust 1.85+** encapsulado mediante **Tauri 2**.
* **Frontend:** Desarrollado en **React 19**, **TypeScript** y **Vite**, empaquetado como aplicación web estática dentro del contenedor webview nativo (WebKitGTK en Linux).
* **Persistencia:** Base de datos **SQLite 3** embebida en modo transaccional **WAL** (*Write-Ahead Logging*).
* **Esquema de Base de Datos:**
  * Tabla `projects` con columnas: `id (UUID v4)`, `name (TEXT)`, `description (TEXT)`, `document_schema_version (INTEGER)`, `document_json (TEXT)`, `created_at (ISO-8601)` y `updated_at (ISO-8601)`.
  * Las migraciones están versionadas con `PRAGMA user_version` mediante `rusqlite_migration`.

### 6.2 Autoguardado debounced y seguridad de datos
* **Estrategia de Guardado:** El frontend implementa un temporizador *debounced* de 1.000 ms tras la última modificación del usuario. Si no hay más interacciones, se despacha el comando IPC `save_project` hacia Rust.
* **Escritura Atómica:** El motor en Rust garantiza escrituras atómicas en disco, imposibilitando la corrupción del documento ante cortes de energía repentinos o caídas del sistema operativo.
* **Aislamiento de Red:** La aplicación no realiza peticiones salientes ni abre puertos de escucha en la máquina anfitrión. El tratamiento de referencias remotas en `$ref` está bloqueado por seguridad contra ataques SSRF y path traversal.

### 6.3 Compatibilidad con OpenAPI 3.1 y JSON Schema
* **Alineación con JSON Schema 2020-12:** Soporta tipos combinados con nulos mediante la directiva `allows_null` (equivalente a `type: ["string", "null"]` en OpenAPI 3.1), prescindiendo del atributo obsoleto `nullable: true` de OpenAPI 3.0.
* **Preservación de Orden:** Los serializadores JSON y YAML preservan el orden de campos para mantener diffs limpios en repositorios Git.
* **Modelo de Dominio Puro:** La lógica de validación e invariantes no depende de la biblioteca de serialización (`oas3`). Se encuentra desacoplada en `src-tauri/src/domain/`, garantizando pruebas unitarias deterministas sin efectos secundarios.

---

## 7. Preguntas Frecuentes (FAQ)

### ¿CAAD reemplaza a herramientas como Postman o Insomnia?
No. Postman e Insomnia son clientes HTTP para enviar peticiones contra servidores que **ya existen**. CAAD se utiliza en la fase previa: cuando el servidor **aún no está programado**, para diseñar el contrato, acordar las reglas con el equipo y simular el comportamiento con la Consola Mock. Una vez exportado el contrato desde CAAD, puede importarlo en Postman si lo desea.

### ¿Dónde se guardan mis proyectos físicamente?
Se almacenan en la base de datos local SQLite administrada por Tauri en el directorio estándar de datos de usuario de su sistema operativo (`~/.local/share/caad/` en Linux, `~/Library/Application Support/caad/` en macOS, o `%APPDATA%\caad\` en Windows).

### ¿Puedo compartir mi diseño con compañeros que no tienen CAAD?
Sí. Simplemente use el botón **"EXPORTAR"** y descargue el archivo `.yaml` o `.json`. Este archivo es un estándar OpenAPI 3.1 universal que puede abrirse en Swagger UI, Redoc, GitHub o cualquier visor de documentación moderna.

### ¿Qué pasa si cometo un error al escribir una ruta?
El motor de validación en tiempo real le mostrará una alerta inmediata en la barra de estado y en el panel de **Validación**. Al hacer clic en la alerta, CAAD lo posicionará exactamente en la operación afectada para que pueda corregirla con comodidad.

### ¿Puedo trabajar sin conexión a Internet?
Sí, en un 100%. CAAD es completamente autónomo y no requiere conectividad en ningún momento de su ciclo de vida.

---
*Documentación generada para el proyecto CAAD — Computer Assisted API Design.*
