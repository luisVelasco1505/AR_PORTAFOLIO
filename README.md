# Portafolio AR - Diseño de Interfaces

Proyecto académico de realidad aumentada desarrollado por:

- Luis Olmedo Velasco
- Allison Garcia
- Daniel Alejandro Perez

Materia: Diseño de Interfaces  
Programa: Ingeniería de Software

## Descripción

Aplicación web AR construida con MindAR y Three.js. La experiencia reconoce una tarjeta objetivo y muestra contenido aumentado: modelo 3D, texto flotante, tarjeta digital del equipo y panel interactivo del portafolio.

## Estructura

```text
project/
  index.html
  style.css
  main.js
  assets/
    card.jpg
    target.mind
    model.glb
```

## Publicación En GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir todo el contenido de esta carpeta `LAB_AR_PORTAFOLIO`.
3. En GitHub, entrar a `Settings > Pages`.
4. En `Build and deployment`, seleccionar `GitHub Actions`.
5. Hacer push a la rama principal del repositorio, por ejemplo `main` o `master`.
6. Esperar a que termine el workflow `Deploy AR portfolio to GitHub Pages`.
7. Abrir el enlace generado por GitHub Pages.

La app debe abrirse desde HTTPS para que el navegador permita usar la cámara.

Este proyecto no necesita Node.js en producción. GitHub Pages solo sirve los archivos estáticos de la carpeta `project`. Node se usa únicamente como una opción para probar localmente con un servidor sencillo.

Si GitHub Pages está configurado como `Deploy from a branch`, la raíz del repositorio redirige automáticamente a:

```text
./project/
```

## Prueba Local

Abrir el proyecto con un servidor local desde la carpeta `project`.

```bash
npx serve .
```

Después entrar a la URL local que indique la terminal.
