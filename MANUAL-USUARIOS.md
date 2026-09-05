\# MANUAL DE USUARIOS Y ROLES



> Sistema LawLink — Juridictas

> Fecha: 2026-09-03

> Base de datos: MariaDB multi-tenant



\---



\## 1. TIPOS DE USUARIOS



\### 1.1 Usuarios del sistema central (FirmUser)



| Usuario | Email | Tipo | Descripción |

|---|---|---|---|

| Gabi - Admin Sistema | gabi@juridictas.ar | ADMIN CENTRAL | Administra estudios y suscripciones |

| Gabi | egbeltrando@gmail.com | Usuario de estudio | Dueño del estudio Juridictas |

| Ambar | ambar@test.com | Usuario de estudio | Miembro del estudio Juridictas |



\### 1.2 Usuarios del estudio (User en tenant)



\- Se crean automáticamente al registrarse el estudio

\- Se administran desde la interfaz web

\- Tienen roles específicos del estudio



\---



\## 2. ROLES DISPONIBLES EN EL ESTUDIO



| Rol | Permisos |

|---|---|

| ADMIN | Acceso total al estudio, crea usuarios, configura todo |

| PRINCIPAL\_LAWYER | Abogado principal, aprueba admisiones, ve todo |

| LAWYER | Abogado, trabaja en sus casos |

| ASSISTANT | Asistente, solo ve casos donde es miembro |

| FINANCE | Finanzas, ve casos para facturar |



\---



\## 3. CÓMO CREAR UN NUEVO USUARIO



\### Opción 1 — Desde la interfaz web (recomendada)



1\. Iniciar sesión como ADMIN del estudio

2\. Ir a \*\*Configuración → Usuarios\*\* (`/settings/users`)

3\. Click en \*\*"Nuevo usuario"\*\*

4\. Completar:

&#x20;  - Nombre y apellido

&#x20;  - Email (único)

&#x20;  - Contraseña (mínimo 8 caracteres)

&#x20;  - Rol

&#x20;  - Teléfono (opcional)

5\. Click \*\*"Crear"\*\*



El usuario recibe sus credenciales y puede iniciar sesión.



\---



\### Opción 2 — Desde la base de datos central (admin del sistema)



Para crear un usuario que puede acceder al estudio:



```bash

\# 1. Entrar al contenedor de MariaDB

docker exec -it <nombre-contenedor> mysql -u juridictas -p



\# 2. Crear el usuario en la tabla FirmUser (central)

USE juridictas;

INSERT INTO FirmUser (id, name, email, passwordHash, active, firmId, createdAt, updatedAt)

VALUES (

&#x20; UUID(),

&#x20; 'Nombre del usuario',

&#x20; 'email@ejemplo.com',

&#x20; '$2a$12$...', -- hash de bcrypt

&#x20; 1,

&#x20; 'cmtka3np30000gbmukk5510g8', -- ID del estudio Juridictas

&#x20; NOW(),

&#x20; NOW()

);



\# 3. Crear el usuario en la tabla User (tenant)

USE juridictas\_juridictas;

INSERT INTO User (id, name, email, passwordHash, role, active, createdAt, updatedAt)

VALUES (

&#x20; UUID(),

&#x20; 'Nombre del usuario',

&#x20; 'email@ejemplo.com',

&#x20; '$2a$12$...', -- hash de bcrypt

&#x20; 'LAWYER', -- ADMIN, PRINCIPAL\_LAWYER, LAWYER, ASSISTANT, FINANCE

&#x20; 1,

&#x20; NOW(),

&#x20; NOW()

);

