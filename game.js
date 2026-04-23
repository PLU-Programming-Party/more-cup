(() => {
  const {
    Engine,
    Render,
    Runner,
    Bodies,
    Body,
    Bounds,
    Vertices,
    Composite,
    Events,
  } = Matter;

  const canvas = document.getElementById("world");
  const fluidCanvas = document.getElementById("fluid-overlay");
  const fluidCtx = fluidCanvas ? fluidCanvas.getContext("2d") : null;
  const stats = document.getElementById("stats");
  const controlsPanel = document.getElementById("controls-panel");
  const controlsList = document.getElementById("controls-list");

  const VIEW = {
    particlesOnly: false,
    showBoth: false,
  };

  const PARTICLE_RENDER = {
    fillStyle: "#51c8ff",
    strokeStyle: "#a9ebff",
    lineWidth: 1,
  };

  const WATER = {
    gravityY: 1.1,
    solverPositionIterations: 8,
    solverVelocityIterations: 6,
    emissionRate: 170,
    maxBodies: 6000,
    dropRadiusMin: 4,
    dropRadiusMax: 6.7,
    spawnSpreadX: 7,
    spawnSpreadY: 4,
    spawnOffsetY: -10,
    restitution: 0.03,
    friction: 0.01,
    frictionStatic: 0,
    frictionAir: 0.004,
    density: 0.0012,
    slop: 0.01,
    velocityXRange: 0.6,
    velocityYMax: 0.2,
  };

  const METABALLS = {
    cellSize: 12,
    threshold: 1,
    influenceScale: 6.4,
    maxParticles: 420,
    cullMargin: 140,
    fillHue: 198,
    fillSaturation: 93,
    fillLightness: 65,
    fillAlpha: 0.72,
    edgeHue: 194,
    edgeSaturation: 100,
    edgeLightness: 84,
    edgeAlpha: 0.38,
    glowHue: 196,
    glowSaturation: 95,
    glowLightness: 55,
    glowAlpha: 0.35,
    glowBlur: 16,
    edgeWidth: 1.2,
    fillStyle: "",
    edgeStyle: "",
    glowStyle: "",
  };

  const WORLD = {
    wallThickness: 120,
    floorHeight: 90,
    platformThickness: 24,
    surfaceRestitution: 0.05,
  };

  const CONTROL_HELP = {
    "particles-only": "Render only the circle particles and hide blobs.",
    "show-both": "Render circle particles and keep blobs visible with extra translucency.",
    "gravity-y": "Controls downward pull on particles. Higher values make liquid fall faster.",
    "solver-position-iters": "How many position solver passes run per step. Higher values reduce overlap and improve stability.",
    "solver-velocity-iters": "How many velocity solver passes run per step. Higher values improve collision response.",
    "emission-rate": "Particles spawned per second while pouring.",
    "max-bodies": "Maximum active water particles. Oldest particles are removed after this cap.",
    "drop-radius-min": "Minimum radius for newly spawned particles.",
    "drop-radius-max": "Maximum radius for newly spawned particles.",
    "spawn-spread-x": "Horizontal spread around the pointer when spawning new particles.",
    "spawn-spread-y": "Vertical spawn jitter for new particles.",
    "spawn-offset-y": "Vertical offset from the pointer for spawn position.",
    restitution: "How bouncy each water particle is when it collides.",
    "surface-restitution": "How bouncy the floor, walls, and platform are.",
    friction: "Sliding resistance during contact. Higher values make particles drag along surfaces.",
    "friction-static": "Initial stickiness before motion begins on contact.",
    "friction-air": "Air drag while particles move. Higher values damp motion faster.",
    density: "Particle mass density. Higher values increase collision weight.",
    slop: "Allowed penetration tolerance in collisions. Lower values are tighter but can be jittery.",
    "velocity-x": "Random horizontal launch speed for newly spawned particles.",
    "velocity-y": "Random downward launch speed for newly spawned particles.",
    "cell-size": "Grid resolution used by metaballs. Smaller cells look smoother but cost more performance.",
    threshold: "Iso-surface cutoff for the metaballs field. Lower values create thicker liquid.",
    "influence-scale": "How far each particle influences the metaballs field.",
    "max-particles": "Maximum particles sampled for overlay rendering.",
    "cull-margin": "Extra offscreen margin included in metaball rendering.",
    "glow-blur": "Soft glow blur radius around the fluid fill.",
    "edge-width": "Outline thickness around the fluid shape.",
    "fill-hue": "Fill color hue angle.",
    "fill-saturation": "Fill color saturation percentage.",
    "fill-lightness": "Fill color lightness percentage.",
    "fill-alpha": "Fill opacity.",
    "edge-hue": "Outline color hue angle.",
    "edge-saturation": "Outline color saturation percentage.",
    "edge-lightness": "Outline color lightness percentage.",
    "edge-alpha": "Outline opacity.",
    "glow-hue": "Glow color hue angle.",
    "glow-saturation": "Glow color saturation percentage.",
    "glow-lightness": "Glow color lightness percentage.",
    "glow-alpha": "Glow opacity.",
  };

  const STORAGE_KEY = "more-cup-config-v1";

  loadPersistedConfig();

  refreshMetaballStyles();

  const engine = Engine.create({
    gravity: { x: 0, y: WATER.gravityY },
  });

  engine.positionIterations = WATER.solverPositionIterations;
  engine.velocityIterations = WATER.solverVelocityIterations;

  const render = Render.create({
    engine,
    canvas,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
      background: "transparent",
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    },
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  const metaballField = {
    cols: 0,
    rows: 0,
    values: new Float32Array(0),
    minCol: 0,
    maxCol: -1,
    minRow: 0,
    maxRow: -1,
  };

  let boundaries = [];
  let centerPlatform = null;
  let draggablePlatform = null;

  const waterBodies = [];

  let activePointerId = null;
  let isPouring = false;
  let isDraggingPlatform = false;
  let dragOffset = { x: 0, y: 0 };
  let pourPoint = { x: window.innerWidth / 2, y: 80 };
  let emitAccumulator = 0;
  let totalDrops = 0;
  let smoothedFps = 0;
  let lastHudUpdate = 0;

  if (stats) {
    stats.textContent = "drops: 0 | fps: --";
  }

  function refreshMetaballStyles() {
    METABALLS.fillStyle = `hsla(${METABALLS.fillHue}, ${METABALLS.fillSaturation}%, ${METABALLS.fillLightness}%, ${METABALLS.fillAlpha})`;
    METABALLS.edgeStyle = `hsla(${METABALLS.edgeHue}, ${METABALLS.edgeSaturation}%, ${METABALLS.edgeLightness}%, ${METABALLS.edgeAlpha})`;
    METABALLS.glowStyle = `hsla(${METABALLS.glowHue}, ${METABALLS.glowSaturation}%, ${METABALLS.glowLightness}%, ${METABALLS.glowAlpha})`;
  }

  function clampNumber(value, min, max, fallback, shouldRound = false) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return fallback;
    }

    const clamped = Math.max(min, Math.min(max, value));
    return shouldRound ? Math.round(clamped) : clamped;
  }

  function loadPersistedConfig() {
    let parsed = null;

    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const savedWater = parsed.water;
    if (savedWater && typeof savedWater === "object") {
      WATER.gravityY = clampNumber(savedWater.gravityY, 0, 2.8, WATER.gravityY);
      WATER.solverPositionIterations = clampNumber(
        savedWater.solverPositionIterations,
        1,
        20,
        WATER.solverPositionIterations,
        true
      );
      WATER.solverVelocityIterations = clampNumber(
        savedWater.solverVelocityIterations,
        1,
        20,
        WATER.solverVelocityIterations,
        true
      );
      WATER.emissionRate = clampNumber(savedWater.emissionRate, 0, 500, WATER.emissionRate);
      WATER.maxBodies = clampNumber(savedWater.maxBodies, 200, 12000, WATER.maxBodies, true);
      WATER.dropRadiusMin = clampNumber(savedWater.dropRadiusMin, 1, 12, WATER.dropRadiusMin);
      WATER.dropRadiusMax = clampNumber(savedWater.dropRadiusMax, 1, 14, WATER.dropRadiusMax);
      WATER.spawnSpreadX = clampNumber(savedWater.spawnSpreadX, 0, 24, WATER.spawnSpreadX);
      WATER.spawnSpreadY = clampNumber(savedWater.spawnSpreadY, 0, 20, WATER.spawnSpreadY);
      WATER.spawnOffsetY = clampNumber(savedWater.spawnOffsetY, -25, 5, WATER.spawnOffsetY);
      WATER.restitution = clampNumber(savedWater.restitution, 0, 1, WATER.restitution);
      WATER.friction = clampNumber(savedWater.friction, 0, 1, WATER.friction);
      WATER.frictionStatic = clampNumber(savedWater.frictionStatic, 0, 1, WATER.frictionStatic);
      WATER.frictionAir = clampNumber(savedWater.frictionAir, 0, 0.1, WATER.frictionAir);
      WATER.density = clampNumber(savedWater.density, 0.0001, 0.01, WATER.density);
      WATER.slop = clampNumber(savedWater.slop, 0.001, 0.1, WATER.slop);
      WATER.velocityXRange = clampNumber(savedWater.velocityXRange, 0, 4, WATER.velocityXRange);
      WATER.velocityYMax = clampNumber(savedWater.velocityYMax, 0, 2, WATER.velocityYMax);
    }

    const savedMetaballs = parsed.metaballs;
    if (savedMetaballs && typeof savedMetaballs === "object") {
      METABALLS.cellSize = clampNumber(savedMetaballs.cellSize, 6, 28, METABALLS.cellSize, true);
      METABALLS.threshold = clampNumber(savedMetaballs.threshold, 0.2, 3, METABALLS.threshold);
      METABALLS.influenceScale = clampNumber(
        savedMetaballs.influenceScale,
        2,
        12,
        METABALLS.influenceScale
      );
      METABALLS.maxParticles = clampNumber(
        savedMetaballs.maxParticles,
        50,
        1200,
        METABALLS.maxParticles,
        true
      );
      METABALLS.cullMargin = clampNumber(savedMetaballs.cullMargin, 20, 360, METABALLS.cullMargin, true);
      METABALLS.fillHue = clampNumber(savedMetaballs.fillHue, 0, 360, METABALLS.fillHue, true);
      METABALLS.fillSaturation = clampNumber(
        savedMetaballs.fillSaturation,
        0,
        100,
        METABALLS.fillSaturation,
        true
      );
      METABALLS.fillLightness = clampNumber(
        savedMetaballs.fillLightness,
        0,
        100,
        METABALLS.fillLightness,
        true
      );
      METABALLS.fillAlpha = clampNumber(savedMetaballs.fillAlpha, 0, 1, METABALLS.fillAlpha);
      METABALLS.edgeHue = clampNumber(savedMetaballs.edgeHue, 0, 360, METABALLS.edgeHue, true);
      METABALLS.edgeSaturation = clampNumber(
        savedMetaballs.edgeSaturation,
        0,
        100,
        METABALLS.edgeSaturation,
        true
      );
      METABALLS.edgeLightness = clampNumber(
        savedMetaballs.edgeLightness,
        0,
        100,
        METABALLS.edgeLightness,
        true
      );
      METABALLS.edgeAlpha = clampNumber(savedMetaballs.edgeAlpha, 0, 1, METABALLS.edgeAlpha);
      METABALLS.glowHue = clampNumber(savedMetaballs.glowHue, 0, 360, METABALLS.glowHue, true);
      METABALLS.glowSaturation = clampNumber(
        savedMetaballs.glowSaturation,
        0,
        100,
        METABALLS.glowSaturation,
        true
      );
      METABALLS.glowLightness = clampNumber(
        savedMetaballs.glowLightness,
        0,
        100,
        METABALLS.glowLightness,
        true
      );
      METABALLS.glowAlpha = clampNumber(savedMetaballs.glowAlpha, 0, 1, METABALLS.glowAlpha);
      METABALLS.glowBlur = clampNumber(savedMetaballs.glowBlur, 0, 50, METABALLS.glowBlur);
      METABALLS.edgeWidth = clampNumber(savedMetaballs.edgeWidth, 0, 4, METABALLS.edgeWidth);
    }

    const savedWorld = parsed.world;
    if (savedWorld && typeof savedWorld === "object") {
      WORLD.surfaceRestitution = clampNumber(
        savedWorld.surfaceRestitution,
        0,
        1,
        WORLD.surfaceRestitution
      );
    }

    const savedView = parsed.view;
    if (savedView && typeof savedView === "object") {
      VIEW.particlesOnly = Boolean(savedView.particlesOnly);
      VIEW.showBoth = Boolean(savedView.showBoth);
      if (VIEW.particlesOnly && VIEW.showBoth) {
        VIEW.showBoth = false;
      }
    }
  }

  function savePersistedConfig() {
    const payload = {
      water: {
        gravityY: WATER.gravityY,
        solverPositionIterations: WATER.solverPositionIterations,
        solverVelocityIterations: WATER.solverVelocityIterations,
        emissionRate: WATER.emissionRate,
        maxBodies: WATER.maxBodies,
        dropRadiusMin: WATER.dropRadiusMin,
        dropRadiusMax: WATER.dropRadiusMax,
        spawnSpreadX: WATER.spawnSpreadX,
        spawnSpreadY: WATER.spawnSpreadY,
        spawnOffsetY: WATER.spawnOffsetY,
        restitution: WATER.restitution,
        friction: WATER.friction,
        frictionStatic: WATER.frictionStatic,
        frictionAir: WATER.frictionAir,
        density: WATER.density,
        slop: WATER.slop,
        velocityXRange: WATER.velocityXRange,
        velocityYMax: WATER.velocityYMax,
      },
      metaballs: {
        cellSize: METABALLS.cellSize,
        threshold: METABALLS.threshold,
        influenceScale: METABALLS.influenceScale,
        maxParticles: METABALLS.maxParticles,
        cullMargin: METABALLS.cullMargin,
        fillHue: METABALLS.fillHue,
        fillSaturation: METABALLS.fillSaturation,
        fillLightness: METABALLS.fillLightness,
        fillAlpha: METABALLS.fillAlpha,
        edgeHue: METABALLS.edgeHue,
        edgeSaturation: METABALLS.edgeSaturation,
        edgeLightness: METABALLS.edgeLightness,
        edgeAlpha: METABALLS.edgeAlpha,
        glowHue: METABALLS.glowHue,
        glowSaturation: METABALLS.glowSaturation,
        glowLightness: METABALLS.glowLightness,
        glowAlpha: METABALLS.glowAlpha,
        glowBlur: METABALLS.glowBlur,
        edgeWidth: METABALLS.edgeWidth,
      },
      world: {
        surfaceRestitution: WORLD.surfaceRestitution,
      },
      view: {
        particlesOnly: VIEW.particlesOnly,
        showBoth: VIEW.showBoth,
      },
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore persistence failures (e.g., disabled storage).
    }
  }

  function stepPrecision(step) {
    const stepText = String(step);
    const decimalIndex = stepText.indexOf(".");
    return decimalIndex === -1 ? 0 : Math.min(stepText.length - decimalIndex - 1, 6);
  }

  function formatSliderValue(value, step, formatter) {
    if (typeof formatter === "function") {
      return formatter(value);
    }

    const decimals = stepPrecision(step);
    return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
  }

  function addSliderControl(parent, control) {
    const item = document.createElement("div");
    item.className = "control-item";

    const meta = document.createElement("div");
    meta.className = "control-meta";

    const label = document.createElement("label");
    const value = document.createElement("span");
    value.className = "control-value";

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(control.min);
    input.max = String(control.max);
    input.step = String(control.step);

    const inputId = `control-${control.id}`;
    input.id = inputId;
    label.htmlFor = inputId;
    label.textContent = control.label;
    const helpText = CONTROL_HELP[control.id] || `Adjusts ${control.label}.`;

    label.title = helpText;
    input.title = helpText;

    const syncDisplay = () => {
      value.textContent = formatSliderValue(control.get(), control.step, control.formatter);
    };

    input.value = String(control.get());
    syncDisplay();

    input.addEventListener("input", () => {
      const nextValue = Number(input.value);
      control.set(nextValue);
      if (typeof control.onChange === "function") {
        control.onChange(nextValue);
      }

      savePersistedConfig();

      input.value = String(control.get());
      syncDisplay();
    });

    meta.append(label, value);
    item.append(meta, input);

    const stepText = document.createElement("p");
    stepText.className = "control-step";
    stepText.textContent = `step ${control.step}`;

    const help = document.createElement("p");
    help.className = "control-help";
    help.textContent = helpText;

    item.append(stepText, help);

    parent.appendChild(item);
  }

  function addToggleControl(parent, control) {
    const item = document.createElement("div");
    item.className = "control-item";

    const meta = document.createElement("div");
    meta.className = "control-meta";

    const label = document.createElement("label");
    const value = document.createElement("span");
    value.className = "control-value";

    const input = document.createElement("input");
    input.type = "checkbox";

    const inputId = `control-${control.id}`;
    input.id = inputId;
    label.htmlFor = inputId;
    label.textContent = control.label;

    const helpText = CONTROL_HELP[control.id] || `Toggles ${control.label}.`;
    label.title = helpText;
    input.title = helpText;

    const syncDisplay = () => {
      value.textContent = control.get() ? "on" : "off";
      input.checked = Boolean(control.get());
    };

    syncDisplay();

    input.addEventListener("change", () => {
      control.set(Boolean(input.checked));
      if (typeof control.onChange === "function") {
        control.onChange(Boolean(input.checked));
      }

      savePersistedConfig();
      syncDisplay();
    });

    meta.append(label, value);
    item.append(meta, input);

    const toggleText = document.createElement("p");
    toggleText.className = "control-step";
    toggleText.textContent = "toggle";

    const help = document.createElement("p");
    help.className = "control-help";
    help.textContent = helpText;

    item.append(toggleText, help);
    parent.appendChild(item);
  }

  function buildControlsPanel() {
    if (!controlsPanel || !controlsList) {
      return;
    }

    controlsList.replaceChildren();

    const controlGroups = [
      {
        title: "display",
        toggles: [
          {
            id: "particles-only",
            label: "particles only",
            get: () => VIEW.particlesOnly,
            set: (enabled) => {
              VIEW.particlesOnly = Boolean(enabled);
              if (VIEW.particlesOnly) {
                VIEW.showBoth = false;
              }
              syncViewMode();
              buildControlsPanel();
            },
          },
          {
            id: "show-both",
            label: "show both (translucent blobs)",
            get: () => VIEW.showBoth,
            set: (enabled) => {
              VIEW.showBoth = Boolean(enabled);
              if (VIEW.showBoth) {
                VIEW.particlesOnly = false;
              }
              syncViewMode();
              buildControlsPanel();
            },
          },
        ],
      },
      {
        title: "water physics",
        controls: [
          {
            id: "gravity-y",
            label: "gravity y",
            min: 0,
            max: 2.8,
            step: 0.01,
            get: () => WATER.gravityY,
            set: (value) => {
              WATER.gravityY = value;
              engine.gravity.y = value;
            },
          },
          {
            id: "solver-position-iters",
            label: "solver position iters",
            min: 1,
            max: 20,
            step: 1,
            get: () => WATER.solverPositionIterations,
            set: (value) => {
              WATER.solverPositionIterations = Math.round(value);
              engine.positionIterations = WATER.solverPositionIterations;
            },
          },
          {
            id: "solver-velocity-iters",
            label: "solver velocity iters",
            min: 1,
            max: 20,
            step: 1,
            get: () => WATER.solverVelocityIterations,
            set: (value) => {
              WATER.solverVelocityIterations = Math.round(value);
              engine.velocityIterations = WATER.solverVelocityIterations;
            },
          },
          {
            id: "emission-rate",
            label: "emission rate",
            min: 0,
            max: 500,
            step: 1,
            get: () => WATER.emissionRate,
            set: (value) => {
              WATER.emissionRate = value;
            },
          },
          {
            id: "max-bodies",
            label: "max water bodies",
            min: 200,
            max: 12000,
            step: 10,
            get: () => WATER.maxBodies,
            set: (value) => {
              WATER.maxBodies = Math.round(value);
            },
          },
          {
            id: "drop-radius-min",
            label: "drop radius min",
            min: 1,
            max: 12,
            step: 0.1,
            get: () => WATER.dropRadiusMin,
            set: (value) => {
              WATER.dropRadiusMin = value;
            },
          },
          {
            id: "drop-radius-max",
            label: "drop radius max",
            min: 1,
            max: 14,
            step: 0.1,
            get: () => WATER.dropRadiusMax,
            set: (value) => {
              WATER.dropRadiusMax = value;
            },
          },
          {
            id: "spawn-spread-x",
            label: "spawn spread x",
            min: 0,
            max: 24,
            step: 0.1,
            get: () => WATER.spawnSpreadX,
            set: (value) => {
              WATER.spawnSpreadX = value;
            },
          },
          {
            id: "spawn-spread-y",
            label: "spawn spread y",
            min: 0,
            max: 20,
            step: 0.1,
            get: () => WATER.spawnSpreadY,
            set: (value) => {
              WATER.spawnSpreadY = value;
            },
          },
          {
            id: "spawn-offset-y",
            label: "spawn offset y",
            min: -25,
            max: 5,
            step: 0.5,
            get: () => WATER.spawnOffsetY,
            set: (value) => {
              WATER.spawnOffsetY = value;
            },
          },
          {
            id: "restitution",
            label: "restitution",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => WATER.restitution,
            set: (value) => {
              WATER.restitution = value;
            },
          },
          {
            id: "surface-restitution",
            label: "surface restitution",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => WORLD.surfaceRestitution,
            set: (value) => {
              setWorldSurfaceRestitution(value);
            },
          },
          {
            id: "friction",
            label: "friction",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => WATER.friction,
            set: (value) => {
              WATER.friction = value;
            },
          },
          {
            id: "friction-static",
            label: "friction static",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => WATER.frictionStatic,
            set: (value) => {
              WATER.frictionStatic = value;
            },
          },
          {
            id: "friction-air",
            label: "friction air",
            min: 0,
            max: 0.1,
            step: 0.001,
            get: () => WATER.frictionAir,
            set: (value) => {
              WATER.frictionAir = value;
            },
          },
          {
            id: "density",
            label: "density",
            min: 0.0001,
            max: 0.01,
            step: 0.0001,
            get: () => WATER.density,
            set: (value) => {
              WATER.density = value;
            },
          },
          {
            id: "slop",
            label: "slop",
            min: 0.001,
            max: 0.1,
            step: 0.001,
            get: () => WATER.slop,
            set: (value) => {
              WATER.slop = value;
            },
          },
          {
            id: "velocity-x",
            label: "velocity x range",
            min: 0,
            max: 4,
            step: 0.01,
            get: () => WATER.velocityXRange,
            set: (value) => {
              WATER.velocityXRange = value;
            },
          },
          {
            id: "velocity-y",
            label: "velocity y max",
            min: 0,
            max: 2,
            step: 0.01,
            get: () => WATER.velocityYMax,
            set: (value) => {
              WATER.velocityYMax = value;
            },
          },
        ],
      },
      {
        title: "metaballs shape",
        controls: [
          {
            id: "cell-size",
            label: "cell size",
            min: 6,
            max: 28,
            step: 1,
            get: () => METABALLS.cellSize,
            set: (value) => {
              METABALLS.cellSize = Math.round(value);
              resizeFluidBuffers();
            },
          },
          {
            id: "threshold",
            label: "threshold",
            min: 0.2,
            max: 3,
            step: 0.01,
            get: () => METABALLS.threshold,
            set: (value) => {
              METABALLS.threshold = value;
            },
          },
          {
            id: "influence-scale",
            label: "influence scale",
            min: 2,
            max: 12,
            step: 0.1,
            get: () => METABALLS.influenceScale,
            set: (value) => {
              METABALLS.influenceScale = value;
            },
          },
          {
            id: "max-particles",
            label: "max rendered particles",
            min: 50,
            max: 1200,
            step: 1,
            get: () => METABALLS.maxParticles,
            set: (value) => {
              METABALLS.maxParticles = Math.round(value);
            },
          },
          {
            id: "cull-margin",
            label: "render cull margin",
            min: 20,
            max: 360,
            step: 1,
            get: () => METABALLS.cullMargin,
            set: (value) => {
              METABALLS.cullMargin = Math.round(value);
            },
          },
          {
            id: "glow-blur",
            label: "glow blur",
            min: 0,
            max: 50,
            step: 0.5,
            get: () => METABALLS.glowBlur,
            set: (value) => {
              METABALLS.glowBlur = value;
            },
          },
          {
            id: "edge-width",
            label: "edge width",
            min: 0,
            max: 4,
            step: 0.1,
            get: () => METABALLS.edgeWidth,
            set: (value) => {
              METABALLS.edgeWidth = value;
            },
          },
        ],
      },
      {
        title: "metaballs color",
        controls: [
          {
            id: "fill-hue",
            label: "fill hue",
            min: 0,
            max: 360,
            step: 1,
            get: () => METABALLS.fillHue,
            set: (value) => {
              METABALLS.fillHue = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "fill-saturation",
            label: "fill saturation",
            min: 0,
            max: 100,
            step: 1,
            get: () => METABALLS.fillSaturation,
            set: (value) => {
              METABALLS.fillSaturation = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "fill-lightness",
            label: "fill lightness",
            min: 0,
            max: 100,
            step: 1,
            get: () => METABALLS.fillLightness,
            set: (value) => {
              METABALLS.fillLightness = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "fill-alpha",
            label: "fill alpha",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => METABALLS.fillAlpha,
            set: (value) => {
              METABALLS.fillAlpha = value;
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "edge-hue",
            label: "edge hue",
            min: 0,
            max: 360,
            step: 1,
            get: () => METABALLS.edgeHue,
            set: (value) => {
              METABALLS.edgeHue = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "edge-saturation",
            label: "edge saturation",
            min: 0,
            max: 100,
            step: 1,
            get: () => METABALLS.edgeSaturation,
            set: (value) => {
              METABALLS.edgeSaturation = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "edge-lightness",
            label: "edge lightness",
            min: 0,
            max: 100,
            step: 1,
            get: () => METABALLS.edgeLightness,
            set: (value) => {
              METABALLS.edgeLightness = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "edge-alpha",
            label: "edge alpha",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => METABALLS.edgeAlpha,
            set: (value) => {
              METABALLS.edgeAlpha = value;
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "glow-hue",
            label: "glow hue",
            min: 0,
            max: 360,
            step: 1,
            get: () => METABALLS.glowHue,
            set: (value) => {
              METABALLS.glowHue = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "glow-saturation",
            label: "glow saturation",
            min: 0,
            max: 100,
            step: 1,
            get: () => METABALLS.glowSaturation,
            set: (value) => {
              METABALLS.glowSaturation = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "glow-lightness",
            label: "glow lightness",
            min: 0,
            max: 100,
            step: 1,
            get: () => METABALLS.glowLightness,
            set: (value) => {
              METABALLS.glowLightness = Math.round(value);
            },
            onChange: refreshMetaballStyles,
          },
          {
            id: "glow-alpha",
            label: "glow alpha",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => METABALLS.glowAlpha,
            set: (value) => {
              METABALLS.glowAlpha = value;
            },
            onChange: refreshMetaballStyles,
          },
        ],
      },
    ];

    controlGroups.forEach((group) => {
      const groupElement = document.createElement("section");
      groupElement.className = "control-group";

      const heading = document.createElement("h3");
      heading.textContent = group.title;
      groupElement.appendChild(heading);

      if (Array.isArray(group.toggles)) {
        group.toggles.forEach((control) => {
          addToggleControl(groupElement, control);
        });
      }

      if (Array.isArray(group.controls)) {
        group.controls.forEach((control) => {
          addSliderControl(groupElement, control);
        });
      }

      controlsList.appendChild(groupElement);
    });
  }

  function removeWorldBodies() {
    boundaries.forEach((body) => Composite.remove(engine.world, body));
    boundaries = [];

    if (centerPlatform) {
      Composite.remove(engine.world, centerPlatform);
      centerPlatform = null;
    }

    if (draggablePlatform) {
      Composite.remove(engine.world, draggablePlatform);
      draggablePlatform = null;
    }
  }

  function buildWorld() {
    removeWorldBodies();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const wt = WORLD.wallThickness;

    const floor = Bodies.rectangle(
      width / 2,
      height + WORLD.floorHeight / 2,
      width + wt * 2,
      WORLD.floorHeight,
      {
        isStatic: true,
        friction: 0.25,
        restitution: WORLD.surfaceRestitution,
        render: { fillStyle: "#5f7f93" },
      }
    );

    const leftWall = Bodies.rectangle(-wt / 2, height / 2, wt, height * 2, {
      isStatic: true,
      restitution: WORLD.surfaceRestitution,
      render: { fillStyle: "#355265" },
    });

    const rightWall = Bodies.rectangle(width + wt / 2, height / 2, wt, height * 2, {
      isStatic: true,
      restitution: WORLD.surfaceRestitution,
      render: { fillStyle: "#355265" },
    });

    const platformY = height * (2 / 3);
    const platformWidth = Math.max(180, Math.min(width * 0.62, 500));

    centerPlatform = Bodies.rectangle(width / 2, platformY, platformWidth, WORLD.platformThickness, {
      isStatic: true,
      friction: 0.35,
      restitution: WORLD.surfaceRestitution,
      chamfer: { radius: 10 },
      render: {
        fillStyle: "#e0bc7a",
        strokeStyle: "#f6dbab",
        lineWidth: 2,
      },
    });

    const draggableWidth = Math.max(110, Math.min(width * 0.3, 230));
    const draggableHeight = WORLD.platformThickness;
    draggablePlatform = Bodies.rectangle(
      width * 0.72,
      height * 0.44,
      draggableWidth,
      draggableHeight,
      {
        isStatic: true,
        friction: 0.32,
        restitution: WORLD.surfaceRestitution,
        chamfer: { radius: 10 },
        render: {
          fillStyle: "#8fb9ff",
          strokeStyle: "#d7e5ff",
          lineWidth: 2,
        },
      }
    );

    boundaries = [floor, leftWall, rightWall];
    Composite.add(engine.world, [...boundaries, centerPlatform, draggablePlatform]);
  }

  function setWorldSurfaceRestitution(value) {
    WORLD.surfaceRestitution = value;

    boundaries.forEach((body) => {
      body.restitution = value;
    });

    if (centerPlatform) {
      centerPlatform.restitution = value;
    }

    if (draggablePlatform) {
      draggablePlatform.restitution = value;
    }
  }

  function applyParticleRenderState(body) {
    body.render.visible = VIEW.particlesOnly || VIEW.showBoth;
    body.render.fillStyle = PARTICLE_RENDER.fillStyle;
    body.render.strokeStyle = PARTICLE_RENDER.strokeStyle;
    body.render.lineWidth = PARTICLE_RENDER.lineWidth;
  }

  function shouldShowBlobs() {
    return !VIEW.particlesOnly || VIEW.showBoth;
  }

  function syncViewMode() {
    const showBlobs = shouldShowBlobs();

    if (fluidCanvas) {
      fluidCanvas.style.display = showBlobs ? "block" : "none";
    }

    for (let i = 0; i < waterBodies.length; i += 1) {
      applyParticleRenderState(waterBodies[i]);
    }
  }

  function resizeFluidBuffers() {
    if (!fluidCanvas || !fluidCtx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fluidCanvas.width = Math.round(window.innerWidth * dpr);
    fluidCanvas.height = Math.round(window.innerHeight * dpr);

    fluidCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fluidCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const cellSize = Math.max(2, METABALLS.cellSize);
    metaballField.cols = Math.ceil(window.innerWidth / cellSize) + 1;
    metaballField.rows = Math.ceil(window.innerHeight / cellSize) + 1;
    metaballField.values = new Float32Array(metaballField.cols * metaballField.rows);
    metaballField.maxCol = -1;
    metaballField.maxRow = -1;
  }

  function sampleMetaballBodies() {
    const sampled = [];
    const width = render.options.width;
    const height = render.options.height;
    const margin = METABALLS.cullMargin;
    const maxParticles = Math.max(1, Math.round(METABALLS.maxParticles));

    for (let i = 0; i < waterBodies.length; i += 1) {
      const body = waterBodies[i];
      const { x, y } = body.position;

      if (x < -margin || x > width + margin || y < -margin || y > height + margin) {
        continue;
      }

      sampled.push(body);
    }

    if (sampled.length <= maxParticles) {
      return sampled;
    }

    const step = sampled.length / maxParticles;
    const reduced = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i += 1) {
      reduced[i] = sampled[Math.floor(i * step)];
    }

    return reduced;
  }

  function buildMetaballField(sampledBodies) {
    const { cols, rows, values } = metaballField;
    values.fill(0);

    let minCol = cols;
    let maxCol = -1;
    let minRow = rows;
    let maxRow = -1;

    for (let i = 0; i < sampledBodies.length; i += 1) {
      const body = sampledBodies[i];
      const x = body.position.x;
      const y = body.position.y;
      const baseRadius = body.circleRadius || 5;
      const influenceRadius = baseRadius * METABALLS.influenceScale;
      const influenceRadiusSq = influenceRadius * influenceRadius;
      const cellSize = METABALLS.cellSize;

      const startCol = Math.max(0, Math.floor((x - influenceRadius) / cellSize));
      const endCol = Math.min(cols - 1, Math.ceil((x + influenceRadius) / cellSize));
      const startRow = Math.max(0, Math.floor((y - influenceRadius) / cellSize));
      const endRow = Math.min(rows - 1, Math.ceil((y + influenceRadius) / cellSize));

      if (startCol < minCol) {
        minCol = startCol;
      }
      if (endCol > maxCol) {
        maxCol = endCol;
      }
      if (startRow < minRow) {
        minRow = startRow;
      }
      if (endRow > maxRow) {
        maxRow = endRow;
      }

      for (let row = startRow; row <= endRow; row += 1) {
        const sampleY = row * cellSize;
        const dy = sampleY - y;
        const dySq = dy * dy;

        for (let col = startCol; col <= endCol; col += 1) {
          const sampleX = col * cellSize;
          const dx = sampleX - x;
          const distSq = dx * dx + dySq + 1;

          if (distSq <= influenceRadiusSq + 1) {
            values[row * cols + col] += influenceRadiusSq / distSq;
          }
        }
      }
    }

    if (maxCol === -1 || maxRow === -1) {
      metaballField.minCol = 0;
      metaballField.maxCol = -1;
      metaballField.minRow = 0;
      metaballField.maxRow = -1;
      return;
    }

    metaballField.minCol = minCol;
    metaballField.maxCol = maxCol;
    metaballField.minRow = minRow;
    metaballField.maxRow = maxRow;
  }

  function isoLerp(v1, v2) {
    const denominator = v2 - v1;
    if (Math.abs(denominator) < 0.0001) {
      return 0.5;
    }

    const t = (METABALLS.threshold - v1) / denominator;
    return Math.max(0, Math.min(1, t));
  }

  function tracePolygon(ctx, points, keys) {
    if (keys.length === 0) {
      return;
    }

    const first = points[keys[0]];
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < keys.length; i += 1) {
      const point = points[keys[i]];
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
  }

  function traceMetaballCell(ctx, x, y, va, vb, vc, vd) {
    const threshold = METABALLS.threshold;
    const mask =
      (va >= threshold ? 1 : 0) |
      (vb >= threshold ? 2 : 0) |
      (vc >= threshold ? 4 : 0) |
      (vd >= threshold ? 8 : 0);

    if (mask === 0) {
      return;
    }

    const cellSize = METABALLS.cellSize;
    const topT = isoLerp(va, vb);
    const rightT = isoLerp(vb, vc);
    const bottomT = isoLerp(vd, vc);
    const leftT = isoLerp(va, vd);

    const points = {
      tl: { x, y },
      tr: { x: x + cellSize, y },
      br: { x: x + cellSize, y: y + cellSize },
      bl: { x, y: y + cellSize },
      t: { x: x + topT * cellSize, y },
      r: { x: x + cellSize, y: y + rightT * cellSize },
      b: { x: x + bottomT * cellSize, y: y + cellSize },
      l: { x, y: y + leftT * cellSize },
    };

    const centerValue = (va + vb + vc + vd) * 0.25;

    switch (mask) {
      case 1:
        tracePolygon(ctx, points, ["tl", "t", "l"]);
        break;
      case 2:
        tracePolygon(ctx, points, ["tr", "r", "t"]);
        break;
      case 3:
        tracePolygon(ctx, points, ["tl", "tr", "r", "l"]);
        break;
      case 4:
        tracePolygon(ctx, points, ["br", "b", "r"]);
        break;
      case 5:
        if (centerValue >= threshold) {
          tracePolygon(ctx, points, ["tl", "t", "r", "br", "b", "l"]);
        } else {
          tracePolygon(ctx, points, ["tl", "t", "l"]);
          tracePolygon(ctx, points, ["br", "b", "r"]);
        }
        break;
      case 6:
        tracePolygon(ctx, points, ["tr", "br", "b", "t"]);
        break;
      case 7:
        tracePolygon(ctx, points, ["tl", "tr", "br", "b", "l"]);
        break;
      case 8:
        tracePolygon(ctx, points, ["bl", "l", "b"]);
        break;
      case 9:
        tracePolygon(ctx, points, ["tl", "t", "b", "bl"]);
        break;
      case 10:
        if (centerValue >= threshold) {
          tracePolygon(ctx, points, ["tr", "r", "b", "bl", "l", "t"]);
        } else {
          tracePolygon(ctx, points, ["tr", "r", "t"]);
          tracePolygon(ctx, points, ["bl", "l", "b"]);
        }
        break;
      case 11:
        tracePolygon(ctx, points, ["tl", "tr", "r", "b", "bl"]);
        break;
      case 12:
        tracePolygon(ctx, points, ["bl", "br", "r", "l"]);
        break;
      case 13:
        tracePolygon(ctx, points, ["tl", "t", "r", "br", "bl"]);
        break;
      case 14:
        tracePolygon(ctx, points, ["tr", "br", "bl", "l", "t"]);
        break;
      case 15:
        tracePolygon(ctx, points, ["tl", "tr", "br", "bl"]);
        break;
      default:
        break;
    }
  }

  function renderFluidOverlay() {
    if (!fluidCtx || metaballField.values.length === 0) {
      return;
    }

    const width = render.options.width;
    const height = render.options.height;
    fluidCtx.clearRect(0, 0, width, height);

    if (waterBodies.length === 0) {
      return;
    }

    const sampledBodies = sampleMetaballBodies();
    if (sampledBodies.length === 0) {
      return;
    }

    buildMetaballField(sampledBodies);
    if (metaballField.maxCol < metaballField.minCol || metaballField.maxRow < metaballField.minRow) {
      return;
    }

    const startCol = Math.max(0, metaballField.minCol - 1);
    const endCol = Math.min(metaballField.cols - 2, metaballField.maxCol + 1);
    const startRow = Math.max(0, metaballField.minRow - 1);
    const endRow = Math.min(metaballField.rows - 2, metaballField.maxRow + 1);

    fluidCtx.beginPath();
    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        const index = row * metaballField.cols + col;
        const va = metaballField.values[index];
        const vb = metaballField.values[index + 1];
        const vd = metaballField.values[index + metaballField.cols];
        const vc = metaballField.values[index + metaballField.cols + 1];

        traceMetaballCell(
          fluidCtx,
          col * METABALLS.cellSize,
          row * METABALLS.cellSize,
          va,
          vb,
          vc,
          vd
        );
      }
    }

    const overlayAlphaScale = VIEW.showBoth ? 0.46 : 1;

    fluidCtx.save();
    fluidCtx.globalAlpha = overlayAlphaScale;
    fluidCtx.fillStyle = METABALLS.fillStyle;
    fluidCtx.shadowColor = METABALLS.glowStyle;
    fluidCtx.shadowBlur = METABALLS.glowBlur;
    fluidCtx.fill();
    fluidCtx.restore();

    fluidCtx.save();
    fluidCtx.globalAlpha = overlayAlphaScale;
    fluidCtx.strokeStyle = METABALLS.edgeStyle;
    fluidCtx.lineWidth = METABALLS.edgeWidth;
    fluidCtx.stroke();
    fluidCtx.restore();
  }

  function worldPointFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * render.options.width;
    const y = ((evt.clientY - rect.top) / rect.height) * render.options.height;
    return { x, y };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isPointInsideBody(point, body) {
    if (!body) {
      return false;
    }

    return Bounds.contains(body.bounds, point) && Vertices.contains(body.vertices, point);
  }

  function moveDraggablePlatform(pointerWorldPoint) {
    if (!draggablePlatform) {
      return;
    }

    const halfWidth = (draggablePlatform.bounds.max.x - draggablePlatform.bounds.min.x) / 2;
    const halfHeight = (draggablePlatform.bounds.max.y - draggablePlatform.bounds.min.y) / 2;

    const x = clamp(
      pointerWorldPoint.x - dragOffset.x,
      halfWidth + 10,
      render.options.width - halfWidth - 10
    );

    const y = clamp(
      pointerWorldPoint.y - dragOffset.y,
      halfHeight + 10,
      render.options.height - halfHeight - 10
    );

    Body.setPosition(draggablePlatform, { x, y });
    Body.setVelocity(draggablePlatform, { x: 0, y: 0 });
    Body.setAngularVelocity(draggablePlatform, 0);
    Body.setAngle(draggablePlatform, 0);
  }

  function spawnDrop(sourceX, sourceY) {
    const maxBodies = Math.max(1, Math.round(WATER.maxBodies));
    if (waterBodies.length >= maxBodies) {
      const removed = waterBodies.shift();
      if (removed) {
        Composite.remove(engine.world, removed);
      }
    }

    const radiusMin = Math.min(WATER.dropRadiusMin, WATER.dropRadiusMax);
    const radiusMax = Math.max(WATER.dropRadiusMin, WATER.dropRadiusMax);
    const radius = radiusMin + Math.random() * Math.max(radiusMax - radiusMin, 0.0001);
    const body = Bodies.circle(
      sourceX + (Math.random() - 0.5) * WATER.spawnSpreadX,
      sourceY + WATER.spawnOffsetY + (Math.random() - 0.5) * WATER.spawnSpreadY,
      radius,
      {
        restitution: WATER.restitution,
        friction: WATER.friction,
        frictionStatic: WATER.frictionStatic,
        frictionAir: WATER.frictionAir,
        density: WATER.density,
        slop: WATER.slop,
        render: {},
      }
    );

    applyParticleRenderState(body);

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * WATER.velocityXRange,
      y: Math.random() * WATER.velocityYMax,
    });

    waterBodies.push(body);
    Composite.add(engine.world, body);

    totalDrops += 1;
  }

  function updateHudStats(now = performance.now()) {
    if (!stats || now - lastHudUpdate < 120) {
      return;
    }

    lastHudUpdate = now;
    const fpsValue = smoothedFps > 0 ? Math.round(smoothedFps) : "--";
    stats.textContent = `drops: ${totalDrops} | fps: ${fpsValue}`;
  }

  function startPour(evt) {
    evt.preventDefault();

    if (activePointerId !== null) {
      return;
    }

    const pointerWorldPoint = worldPointFromEvent(evt);
    if (isPointInsideBody(pointerWorldPoint, draggablePlatform)) {
      isDraggingPlatform = true;
      isPouring = false;
      activePointerId = evt.pointerId;
      dragOffset = {
        x: pointerWorldPoint.x - draggablePlatform.position.x,
        y: pointerWorldPoint.y - draggablePlatform.position.y,
      };
      canvas.setPointerCapture(evt.pointerId);
      return;
    }

    activePointerId = evt.pointerId;
    isDraggingPlatform = false;
    isPouring = true;
    pourPoint = pointerWorldPoint;
    canvas.setPointerCapture(evt.pointerId);
  }

  function movePour(evt) {
    if (evt.pointerId !== activePointerId) {
      return;
    }

    evt.preventDefault();
    const pointerWorldPoint = worldPointFromEvent(evt);

    if (isDraggingPlatform) {
      moveDraggablePlatform(pointerWorldPoint);
      return;
    }

    if (isPouring) {
      pourPoint = pointerWorldPoint;
    }
  }

  function stopPour(evt) {
    if (evt.pointerId !== activePointerId) {
      return;
    }

    isPouring = false;
    isDraggingPlatform = false;
    activePointerId = null;
    dragOffset = { x: 0, y: 0 };

    if (canvas.hasPointerCapture(evt.pointerId)) {
      canvas.releasePointerCapture(evt.pointerId);
    }
  }

  let prevTime = performance.now();

  function tick(now) {
    const rawDt = Math.max(now - prevTime, 0.0001);
    const dt = Math.min(rawDt, 34);
    prevTime = now;

    const instantFps = 1000 / rawDt;
    smoothedFps = smoothedFps === 0 ? instantFps : smoothedFps * 0.9 + instantFps * 0.1;

    if (isPouring) {
      emitAccumulator += (dt / 1000) * WATER.emissionRate;
      while (emitAccumulator >= 1) {
        spawnDrop(pourPoint.x, pourPoint.y);
        emitAccumulator -= 1;
      }
    }

    if (!shouldShowBlobs()) {
      if (fluidCtx) {
        fluidCtx.clearRect(0, 0, render.options.width, render.options.height);
      }
    } else {
      renderFluidOverlay();
    }

    updateHudStats(now);
    requestAnimationFrame(tick);
  }

  // Remove particles that drift too far below/above the playable area.
  Events.on(engine, "afterUpdate", () => {
    const width = render.options.width;
    const height = render.options.height;

    for (let i = waterBodies.length - 1; i >= 0; i -= 1) {
      const body = waterBodies[i];
      const { x, y } = body.position;
      if (x < -160 || x > width + 160 || y > height + 320 || y < -320) {
        Composite.remove(engine.world, body);
        waterBodies.splice(i, 1);
      }
    }
  });

  function resize() {
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    resizeFluidBuffers();
    buildWorld();
  }

  canvas.addEventListener("pointerdown", startPour, { passive: false });
  canvas.addEventListener("pointermove", movePour, { passive: false });
  canvas.addEventListener("pointerup", stopPour);
  canvas.addEventListener("pointercancel", stopPour);
  window.addEventListener("resize", resize);

  resizeFluidBuffers();
  syncViewMode();
  buildControlsPanel();
  buildWorld();
  requestAnimationFrame(tick);
})();
