import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const arContainer = document.querySelector("#ar-container");
const appShell = document.querySelector(".app-shell");
const loader = document.querySelector("#loader");
const loaderMessage = document.querySelector("#loader-message");
const retryButton = document.querySelector("#retry-button");
const fallbackPortfolioButton = document.querySelector("#fallback-portfolio-button");
const statusPill = document.querySelector("#tracking-status");
const portfolioPanel = document.querySelector("#portfolio-panel");
const portfolioButton = document.querySelector("#portfolio-button");
const portfolioModal = document.querySelector("#portfolio-modal");
const closePortfolioButton = document.querySelector("#close-portfolio");
const toast = document.querySelector("#toast");

let model;
let floatingText;
let groupCard;
let targetVisible = false;
let mindarThreeInstance;
let experienceStarted = false;
let uiEventsReady = false;

window.__arAppBooted = true;

const setLoaderMessage = (message) => {
  loaderMessage.textContent = message;
};

const getErrorMessage = (error) => {
  if (!error) {
    return "Error desconocido";
  }

  return error.message || String(error);
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
};

const setLoading = (isLoading) => {
  loader.classList.toggle("is-hidden", !isLoading);
};

const showRetry = () => {
  retryButton.classList.add("is-visible");
};

const hideRetry = () => {
  retryButton.classList.remove("is-visible");
};

const showFallbackPortfolio = () => {
  fallbackPortfolioButton.classList.add("is-visible");
};

const hideFallbackPortfolio = () => {
  fallbackPortfolioButton.classList.remove("is-visible");
};

const hasWorkingWebGL = () => {
  const canvas = document.createElement("canvas");
  const contextOptions = {
    alpha: true,
    antialias: false,
    depth: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: "default",
    stencil: false,
  };

  const gl =
    canvas.getContext("webgl2", contextOptions) ||
    canvas.getContext("webgl", contextOptions) ||
    canvas.getContext("experimental-webgl", contextOptions);

  if (!gl) {
    return false;
  }

  const loseContext = gl.getExtension("WEBGL_lose_context");
  if (loseContext) {
    loseContext.loseContext();
  }

  return true;
};

const getArStartupMessage = (error) => {
  const message = getErrorMessage(error);

  if (message.toLowerCase().includes("webgl")) {
    return "WebGL no está disponible en este navegador. Activa la aceleración gráfica de Chrome/Edge, reinicia el navegador y vuelve a abrir la página.";
  }

  return message;
};

window.addEventListener("error", (event) => {
  setLoading(true);
  showRetry();
  showFallbackPortfolio();
  setLoaderMessage(`Error JS: ${getArStartupMessage(event.error || event.message)}`);
});

window.addEventListener("unhandledrejection", (event) => {
  setLoading(true);
  showRetry();
  showFallbackPortfolio();
  setLoaderMessage(`Error async: ${getArStartupMessage(event.reason)}`);
});

const drawRoundedRectangle = (context, x, y, width, height, radius) => {
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    return;
  }

  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const setTargetState = (isFound) => {
  targetVisible = isFound;
  appShell.classList.toggle("is-target-active", isFound);
  portfolioPanel.classList.toggle("is-visible", isFound);
  statusPill.classList.toggle("is-active", isFound);
  statusPill.textContent = isFound ? "Target activo" : "Buscando target";
};

const openPortfolio = () => {
  if (!portfolioModal || !closePortfolioButton) {
    showToast("El panel del portafolio no está disponible.");
    return;
  }

  portfolioModal.classList.add("is-open");
  closePortfolioButton.focus();
};

const closePortfolio = () => {
  if (!portfolioModal) {
    return;
  }

  portfolioModal.classList.remove("is-open");
  portfolioButton.focus();
};

const setupUiEvents = () => {
  if (uiEventsReady) {
    return;
  }

  uiEventsReady = true;

  portfolioButton.addEventListener("click", openPortfolio);
  fallbackPortfolioButton.addEventListener("click", openPortfolio);
  retryButton.addEventListener("click", () => {
    window.location.reload();
  });

  if (closePortfolioButton && portfolioModal) {
    closePortfolioButton.addEventListener("click", closePortfolio);
    portfolioModal.addEventListener("click", (event) => {
      if (event.target.matches("[data-close-portfolio]")) {
        closePortfolio();
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && portfolioModal?.classList.contains("is-open")) {
      closePortfolio();
    }
  });
};

// Crea un texto flotante como textura de canvas para que viva dentro del tracking 3D.
const createTextSprite = (text) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const textureSize = 1024;

  canvas.width = textureSize;
  canvas.height = 512;

  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(84, 243, 255, 0.95)");
  gradient.addColorStop(0.52, "rgba(245, 251, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 79, 216, 0.95)");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(3, 8, 18, 0.62)";
  context.strokeStyle = "rgba(84, 243, 255, 0.7)";
  context.lineWidth = 8;
  drawRoundedRectangle(context, 72, 144, 880, 176, 34);
  context.fill();
  context.stroke();

  context.fillStyle = gradient;
  context.font = "800 72px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(84, 243, 255, 0.85)";
  context.shadowBlur = 26;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, 0.54, 0.16);
  sprite.scale.set(0.92, 0.46, 1);
  sprite.renderOrder = 14;

  return sprite;
};

const createGroupCardSprite = () => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 1024;
  canvas.height = 768;

  const background = context.createLinearGradient(70, 70, 954, 690);
  background.addColorStop(0, "rgba(5, 12, 26, 0.94)");
  background.addColorStop(0.5, "rgba(11, 25, 46, 0.92)");
  background.addColorStop(1, "rgba(30, 8, 38, 0.9)");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(84, 243, 255, 0.5)";
  context.shadowBlur = 34;
  context.fillStyle = background;
  context.strokeStyle = "rgba(84, 243, 255, 0.72)";
  context.lineWidth = 6;
  drawRoundedRectangle(context, 70, 70, 884, 620, 42);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;

  context.strokeStyle = "rgba(255, 79, 216, 0.38)";
  context.lineWidth = 2;
  drawRoundedRectangle(context, 94, 94, 836, 572, 30);
  context.stroke();

  context.fillStyle = "rgba(84, 243, 255, 0.12)";
  context.strokeStyle = "rgba(84, 243, 255, 0.42)";
  context.lineWidth = 3;
  drawRoundedRectangle(context, 142, 118, 740, 68, 26);
  context.fill();
  context.stroke();

  context.fillStyle = "#54f3ff";
  context.font = "800 28px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("INGENIERIA DE SOFTWARE", canvas.width / 2, 152);

  context.fillStyle = "#f5fbff";
  context.font = "900 58px Arial, sans-serif";
  context.fillText("Equipo de trabajo", canvas.width / 2, 246);

  context.fillStyle = "#b9ff5c";
  context.font = "700 31px Arial, sans-serif";
  context.fillText("Diseño de Interfaces · Portafolio AR", canvas.width / 2, 302);

  const names = ["Luis Olmedo Velasco", "Allison Garcia", "Daniel Alejandro Perez"];
  context.textAlign = "left";
  context.font = "800 42px Arial, sans-serif";

  names.forEach((name, index) => {
    const y = 392 + index * 82;

    context.fillStyle = index === 1 ? "#ff4fd8" : "#54f3ff";
    context.beginPath();
    context.arc(205, y, 16, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f5fbff";
    context.fillText(name, 246, y + 1);

    if (index < names.length - 1) {
      context.strokeStyle = "rgba(255, 255, 255, 0.1)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(246, y + 42);
      context.lineTo(822, y + 42);
      context.stroke();
    }
  });

  context.textAlign = "center";
  context.fillStyle = "rgba(245, 251, 255, 0.78)";
  context.font = "700 27px Arial, sans-serif";
  context.fillText("Contenido aumentado sobre tarjeta objetivo", canvas.width / 2, 638);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    opacity: 0.94,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(0.08, -0.12, 0.22);
  sprite.scale.set(0.64, 0.48, 1);
  sprite.renderOrder = 12;

  return sprite;
};

// Modelo de respaldo por si el GLB no carga: mantiene la experiencia visible en clase.
const createFallbackModel = () => {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.22, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x54f3ff,
    emissive: 0x123a40,
    roughness: 0.24,
    metalness: 0.58,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.01, 16, 120),
    new THREE.MeshBasicMaterial({ color: 0xff4fd8 })
  );

  ring.rotation.x = Math.PI / 2.6;
  group.add(mesh, ring);
  return group;
};

const loadModel = (anchorGroup) =>
  new Promise((resolve) => {
    const gltfLoader = new GLTFLoader();

    gltfLoader.load(
      "./assets/model.glb",
      (gltf) => {
        const loadedScene = gltf.scene;
        const box = new THREE.Box3().setFromObject(loadedScene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        loadedScene.position.set(-center.x, -center.y, -center.z);
        loadedScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        model = new THREE.Group();
        model.position.set(0, 0, 0.22);
        model.scale.setScalar(0.46 / maxAxis);
        model.add(loadedScene);

        anchorGroup.add(model);
        resolve();
      },
      undefined,
      () => {
        model = createFallbackModel();
        model.position.set(0, 0, 0.2);
        anchorGroup.add(model);
        showToast("No se pudo cargar model.glb. Se muestra un modelo de respaldo.");
        resolve();
      }
    );
  });

const startMindAR = async () => {
  if (experienceStarted) {
    return;
  }

  experienceStarted = true;
  setLoading(true);
  hideRetry();
  setLoaderMessage("Solicitando permiso de cámara");

  const startTimeout = window.setTimeout(() => {
    setLoading(true);
    setLoaderMessage("La cámara tardó demasiado. Permite la cámara y recarga la experiencia.");
    showRetry();
    showFallbackPortfolio();
  }, 12000);

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("El navegador no permite acceder a la cámara desde esta URL.");
    }

    const permissionStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    permissionStream.getTracks().forEach((track) => track.stop());
    setLoaderMessage("Iniciando tracking AR");

    await mindarThreeInstance.start();
    window.clearTimeout(startTimeout);
    setLoading(false);
  } catch (error) {
    window.clearTimeout(startTimeout);
    experienceStarted = false;
    setLoading(true);
    showRetry();
    showFallbackPortfolio();
    setLoaderMessage(`No se pudo iniciar la cámara: ${getErrorMessage(error)}`);
    console.error("MindAR no pudo iniciar:", error);
  }
};

const setupExperience = async () => {
  setLoading(true);
  hideRetry();
  hideFallbackPortfolio();
  setLoaderMessage("Preparando escena AR");

  if (!hasWorkingWebGL()) {
    throw new Error(
      "WebGL no está disponible. Activa la aceleración gráfica del navegador o prueba Chrome/Edge."
    );
  }

  mindarThreeInstance = new MindARThree({
    container: arContainer,
    imageTargetSrc: "./assets/target.mind",
    filterMinCF: 0.0001,
    filterBeta: 0.001,
  });

  const { renderer, scene, camera } = mindarThreeInstance;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Iluminación básica: combina luz ambiental suave con acentos neón.
  scene.add(new THREE.HemisphereLight(0xeffbff, 0x101422, 1.7));

  const keyLight = new THREE.DirectionalLight(0x54f3ff, 1.8);
  keyLight.position.set(1.4, 1.8, 2);
  scene.add(keyLight);

  const magentaLight = new THREE.PointLight(0xff4fd8, 1.8, 2.8);
  magentaLight.position.set(-0.6, 0.8, 0.8);
  scene.add(magentaLight);

  const anchor = mindarThreeInstance.addAnchor(0);

  floatingText = createTextSprite("GRUPO UI AR");
  anchor.group.add(floatingText);

  groupCard = createGroupCardSprite();
  anchor.group.add(groupCard);

  setLoaderMessage("Cargando modelo 3D");
  await loadModel(anchor.group);

  anchor.onTargetFound = () => setTargetState(true);
  anchor.onTargetLost = () => setTargetState(false);

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();

    if (model) {
      model.rotation.y += 0.018;
      model.position.y = Math.sin(elapsed * 2) * 0.025;
    }

    if (floatingText) {
      floatingText.position.y = 0.54 + Math.sin(elapsed * 2.4) * 0.035;
      floatingText.material.opacity = targetVisible ? 0.92 : 0.55;
    }

    if (groupCard) {
      groupCard.position.y = -0.12 + Math.sin(elapsed * 1.7 + 0.8) * 0.018;
      groupCard.material.opacity = targetVisible ? 0.94 : 0.5;
    }

    renderer.render(scene, camera);
  });

  await startMindAR();
};

window.addEventListener("resize", () => {
  const canvas = arContainer.querySelector("canvas");
  if (canvas) {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }
});

setupUiEvents();
setupExperience().catch((error) => {
  setLoading(true);
  showRetry();
  showFallbackPortfolio();
  setLoaderMessage(`No se pudo preparar AR: ${getArStartupMessage(error)}`);
  console.error("Error preparando la experiencia AR:", error);
});
