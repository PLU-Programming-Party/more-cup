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
    Query,
  } = Matter;

  const canvas = document.getElementById("world");
  const fluidCanvas = document.getElementById("fluid-overlay");
  const fluidCtx = fluidCanvas ? fluidCanvas.getContext("2d") : null;
  const stats = document.getElementById("stats");
  const cupList = document.getElementById("cup-list");
  const controlsPanel = document.getElementById("controls-panel");
  const controlsList = document.getElementById("controls-list");

  const VIEW = {
    particlesOnly: true,
    showBoth: false,
  };

  const PARTICLE_RENDER = {
    fillStyle: "#51c8ff",
    strokeStyle: "#a9ebff",
    lineWidth: 1,
  };

  const SCORE_VALUES = {
    cupTouch: 15,
    environmentTouch: 4,
    particleSplash: 1,
    maxSplashesPerDrop: 4,
  };

  const WATER = {
    gravityY: 2.55,
    solverPositionIterations: 8,
    solverVelocityIterations: 4,
    emissionRate: 97,
    maxBodies: 12000,
    cullBatchSize: 96,
    particleSides: 7,
    dropRadiusMin: 6,
    dropRadiusMax: 5,
    spawnSpreadX: 7,
    spawnSpreadY: 4,
    spawnOffsetY: -10,
    restitution: 0,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
    density: 0.0098,
    slop: 0.082,
    velocityXRange: 0.6,
    velocityYMax: 0.2,
    repulsionRadius: 3.0,
    repulsionStrength: 0.0012,
    repulsionGridSize: 40,
    cupDamping: 0.92,
  };

  const METABALLS = {
    cellSize: 12,
    threshold: 3,
    influenceScale: 3.3,
    maxParticles: 1200,
    cullMargin: 156,
    fillHue: 190,
    fillSaturation: 78,
    fillLightness: 54,
    fillAlpha: 0.72,
    edgeHue: 32,
    edgeSaturation: 0,
    edgeLightness: 84,
    edgeAlpha: 0,
    glowHue: 196,
    glowSaturation: 95,
    glowLightness: 55,
    glowAlpha: 0.35,
    glowBlur: 16,
    edgeWidth: 0,
    fillStyle: "",
    edgeStyle: "",
    glowStyle: "",
  };

  const WORLD = {
    wallThickness: 120,
    floorHeight: 90,
    cupScale: 0.75,
    platformThickness: 24,
    stationaryPlatformHeight: 130,
    draggablePlatformHeight: 250,
    stationaryBottomHoleWidth: 43,
    draggableMaxStep: 14,
    draggableTiltRate: 3.4,
    draggableCollisionStep: 3,
    draggableCollisionAngleStep: 0.035,
    drainWidth: 125,
    surfaceRestitution: 0,
    keyMoveSpeed: 240,
  };

  const MOVABLE_CUP_LAYOUTS = [
    {
      id: "blue-scoop",
      label: "Blue Scoop",
      xRatio: 0.72,
      yRatio: 0.44,
      widthScale: 1,
      heightScale: 1,
      fillStyle: "#8fb9ff",
      strokeStyle: "#d7e5ff",
      bottomGaps: [{ center: 0, width: 0.26 }],
      leftSideGaps: [{ center: -0.16, height: 0.14 }],
      rightSideGaps: [],
      sideLean: 0,
      angle: 0,
    },
    {
      id: "green-funnel",
      label: "Green Funnel",
      xRatio: 0.24,
      yRatio: 0.38,
      widthScale: 0.72,
      heightScale: 0.72,
      fillStyle: "#56d689",
      strokeStyle: "#c8ffd9",
      bottomGaps: [
        { center: -0.24, width: 0.12 },
        { center: 0.24, width: 0.12 },
      ],
      leftSideGaps: [],
      rightSideGaps: [{ center: 0.08, height: 0.18 }],
      sideLean: 0.16,
      angle: -0.18,
    },
    {
      id: "coral-basin",
      label: "Coral Basin",
      xRatio: 0.82,
      yRatio: 0.24,
      widthScale: 1.16,
      heightScale: 0.54,
      fillStyle: "#ff8f85",
      strokeStyle: "#ffd2ca",
      bottomGaps: [
        { center: -0.32, width: 0.09 },
        { center: 0, width: 0.09 },
        { center: 0.32, width: 0.09 },
      ],
      leftSideGaps: [{ center: 0.12, height: 0.16 }],
      rightSideGaps: [{ center: -0.12, height: 0.16 }],
      sideLean: -0.1,
      angle: 0.12,
    },
    {
      id: "violet-orb-cup",
      label: "Round Cup",
      shape: "round",
      xRatio: 0.18,
      yRatio: 0.64,
      widthScale: 0.88,
      heightScale: 1.04,
      fillStyle: "#b889ff",
      strokeStyle: "#ead7ff",
      startAngle: Math.PI * 0.08,
      endAngle: Math.PI * 0.92,
      beadScale: 0.58,
      holeGaps: [],
      angle: 0.24,
    },
    {
      id: "gold-triangle-cup",
      label: "Triangle Cup",
      shape: "polygon",
      xRatio: 0.38,
      yRatio: 0.25,
      widthScale: 0.78,
      heightScale: 0.7,
      fillStyle: "#ffd45f",
      strokeStyle: "#fff0b7",
      points: [
        { x: -0.5, y: -0.42 },
        { x: 0, y: 0.5 },
        { x: 0.5, y: -0.42 },
      ],
      angle: -0.12,
    },
    {
      id: "teal-octagon-cup",
      label: "Octagon Cup",
      shape: "polygon",
      xRatio: 0.58,
      yRatio: 0.24,
      widthScale: 0.86,
      heightScale: 0.76,
      fillStyle: "#36d4c9",
      strokeStyle: "#bdfbf6",
      points: [
        { x: -0.36, y: -0.5 },
        { x: -0.5, y: -0.28 },
        { x: -0.5, y: 0.18 },
        { x: -0.32, y: 0.42 },
        { x: 0, y: 0.52 },
        { x: 0.32, y: 0.42 },
        { x: 0.5, y: 0.18 },
        { x: 0.5, y: -0.28 },
        { x: 0.36, y: -0.5 },
      ],
      angle: 0.08,
    },
    {
      id: "dmac-cup",
      label: "DMAC Cup",
      shape: "dmac",
      xRatio: 0.74,
      yRatio: 0.7,
      widthScale: 1.12,
      heightScale: 0.68,
      fillStyle: "#2fd07f",
      strokeStyle: "#d6ffd9",
      pinStyle: "#f1c84b",
      busStyle: "#206bbd",
      angle: -0.08,
    },
    {
      id: "dr-caley-cup",
      label: "Dr. Caley Cup",
      shape: "caley",
      xRatio: 0.42,
      yRatio: 0.72,
      widthScale: 0.98,
      heightScale: 0.78,
      fillStyle: "#24304f",
      strokeStyle: "#f4c542",
      sensorStyle: "#67e8f9",
      dataStyle: "#f4c542",
      angle: 0.14,
    },
    {
      id: "plug",
      label: "Plug",
      shape: "plug",
      drawer: false,
      xRatio: 0.5,
      yRatio: 1,
      widthScale: 0.8,
      heightScale: 0.8,
      fillStyle: "#b98555",
      strokeStyle: "#ffe0b8",
      bandStyle: "#6f472d",
      angle: 0,
    },
  ];

  const CONTROL_HELP = {
    "particles-only": "Render only the circle particles and hide blobs.",
    "show-both":
      "Render circle particles and keep blobs visible with extra translucency.",
    "gravity-y":
      "Controls downward pull on particles. Higher values make liquid fall faster.",
    "solver-position-iters":
      "How many position solver passes run per step. Higher values reduce overlap and improve stability.",
    "solver-velocity-iters":
      "How many velocity solver passes run per step. Higher values improve collision response.",
    "emission-rate": "Particles spawned per second while pouring.",
    "max-bodies":
      "Maximum active water particles. Oldest particles are removed after this cap.",
    "drop-radius-min": "Minimum radius for newly spawned particles.",
    "drop-radius-max": "Maximum radius for newly spawned particles.",
    "spawn-spread-x":
      "Horizontal spread around the pointer when spawning new particles.",
    "spawn-spread-y": "Vertical spawn jitter for new particles.",
    "spawn-offset-y": "Vertical offset from the pointer for spawn position.",
    restitution: "How bouncy each water particle is when it collides.",
    "surface-restitution": "How bouncy the floor, walls, and platform are.",
    friction:
      "Sliding resistance during contact. Higher values make particles drag along surfaces.",
    "friction-static": "Initial stickiness before motion begins on contact.",
    "friction-air":
      "Air drag while particles move. Higher values damp motion faster.",
    density: "Particle mass density. Higher values increase collision weight.",
    slop: "Allowed penetration tolerance in collisions. Lower values are tighter but can be jittery.",
    "velocity-x": "Random horizontal launch speed for newly spawned particles.",
    "velocity-y": "Random downward launch speed for newly spawned particles.",
    "repulsion-radius":
      "Multiplier on particle radius for repulsion range. Higher values push particles apart over a wider area, making liquid look fuller.",
    "repulsion-strength":
      "Force magnitude of inter-particle repulsion. Higher values push particles apart more aggressively.",
    "cup-damping":
      "Velocity damping applied to particles inside the active cup. Lower values = stronger damping (0 = freeze, 1 = no damping).",
    "stationary-bottom-hole":
      "Width of the opening in the stationary platform's bottom.",
    "cell-size":
      "Grid resolution used by metaballs. Smaller cells look smoother but cost more performance.",
    threshold:
      "Iso-surface cutoff for the metaballs field. Lower values create thicker liquid.",
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
  const metaballSampleBuffer = [];

  let boundaries = [];
  let centerPlatform = null;
  let drainSensor = null;
  let draggablePlatforms = [];
  let activeDraggablePlatform = null;
  let activeDraggableIndex = 0;
  const spawnedCupStates = [];

  const waterBodies = [];
  const waterBodySet = new Set();
  const cupBodySet = new Set();
  const environmentBodySet = new Set();
  const blackHoleBodySet = new Set();
  const blackHoleDeletionQueue = new Set();

  let activePointerId = null;
  let isPouring = false;
  let isDraggingPlatform = false;
  let dragOffset = { x: 0, y: 0 };
  let dragTarget = null;
  let tiltInput = 0;
  const tiltKeys = { left: false, right: false };
  const moveKeys = { up: false, down: false, left: false, right: false };
  let pourPoint = { x: window.innerWidth / 2, y: 80 };
  let emitAccumulator = 0;
  let score = 0;
  let smoothedFps = 0;
  let lastHudUpdate = 0;

  if (stats) {
    stats.textContent = "score: 0 | drops: 0 | fps: --";
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
        true,
      );
      WATER.solverVelocityIterations = clampNumber(
        savedWater.solverVelocityIterations,
        1,
        20,
        WATER.solverVelocityIterations,
        true,
      );
      WATER.emissionRate = clampNumber(
        savedWater.emissionRate,
        0,
        500,
        WATER.emissionRate,
      );
      WATER.maxBodies = clampNumber(
        savedWater.maxBodies,
        200,
        30000,
        WATER.maxBodies,
        true,
      );
      WATER.dropRadiusMin = clampNumber(
        savedWater.dropRadiusMin,
        1,
        12,
        WATER.dropRadiusMin,
      );
      WATER.dropRadiusMax = clampNumber(
        savedWater.dropRadiusMax,
        1,
        14,
        WATER.dropRadiusMax,
      );
      WATER.spawnSpreadX = clampNumber(
        savedWater.spawnSpreadX,
        0,
        24,
        WATER.spawnSpreadX,
      );
      WATER.spawnSpreadY = clampNumber(
        savedWater.spawnSpreadY,
        0,
        20,
        WATER.spawnSpreadY,
      );
      WATER.spawnOffsetY = clampNumber(
        savedWater.spawnOffsetY,
        -25,
        5,
        WATER.spawnOffsetY,
      );
      WATER.restitution = clampNumber(
        savedWater.restitution,
        0,
        1,
        WATER.restitution,
      );
      WATER.friction = clampNumber(savedWater.friction, 0, 1, WATER.friction);
      WATER.frictionStatic = clampNumber(
        savedWater.frictionStatic,
        0,
        1,
        WATER.frictionStatic,
      );
      WATER.frictionAir = clampNumber(
        savedWater.frictionAir,
        0,
        0.1,
        WATER.frictionAir,
      );
      WATER.density = clampNumber(
        savedWater.density,
        0.0001,
        0.01,
        WATER.density,
      );
      WATER.slop = clampNumber(savedWater.slop, 0.001, 0.1, WATER.slop);
      WATER.velocityXRange = clampNumber(
        savedWater.velocityXRange,
        0,
        4,
        WATER.velocityXRange,
      );
      WATER.velocityYMax = clampNumber(
        savedWater.velocityYMax,
        0,
        2,
        WATER.velocityYMax,
      );
      WATER.repulsionRadius = clampNumber(
        savedWater.repulsionRadius,
        0,
        8,
        WATER.repulsionRadius,
      );
      WATER.repulsionStrength = clampNumber(
        savedWater.repulsionStrength,
        0,
        0.01,
        WATER.repulsionStrength,
      );
      WATER.cupDamping = clampNumber(
        savedWater.cupDamping,
        0,
        1,
        WATER.cupDamping,
      );
    }

    const savedMetaballs = parsed.metaballs;
    if (savedMetaballs && typeof savedMetaballs === "object") {
      METABALLS.cellSize = clampNumber(
        savedMetaballs.cellSize,
        6,
        28,
        METABALLS.cellSize,
        true,
      );
      METABALLS.threshold = clampNumber(
        savedMetaballs.threshold,
        0.2,
        3,
        METABALLS.threshold,
      );
      METABALLS.influenceScale = clampNumber(
        savedMetaballs.influenceScale,
        2,
        12,
        METABALLS.influenceScale,
      );
      METABALLS.maxParticles = clampNumber(
        savedMetaballs.maxParticles,
        50,
        3000,
        METABALLS.maxParticles,
        true,
      );
      METABALLS.cullMargin = clampNumber(
        savedMetaballs.cullMargin,
        20,
        360,
        METABALLS.cullMargin,
        true,
      );
      METABALLS.fillHue = clampNumber(
        savedMetaballs.fillHue,
        0,
        360,
        METABALLS.fillHue,
        true,
      );
      METABALLS.fillSaturation = clampNumber(
        savedMetaballs.fillSaturation,
        0,
        100,
        METABALLS.fillSaturation,
        true,
      );
      METABALLS.fillLightness = clampNumber(
        savedMetaballs.fillLightness,
        0,
        100,
        METABALLS.fillLightness,
        true,
      );
      METABALLS.fillAlpha = clampNumber(
        savedMetaballs.fillAlpha,
        0,
        1,
        METABALLS.fillAlpha,
      );
      METABALLS.edgeHue = clampNumber(
        savedMetaballs.edgeHue,
        0,
        360,
        METABALLS.edgeHue,
        true,
      );
      METABALLS.edgeSaturation = clampNumber(
        savedMetaballs.edgeSaturation,
        0,
        100,
        METABALLS.edgeSaturation,
        true,
      );
      METABALLS.edgeLightness = clampNumber(
        savedMetaballs.edgeLightness,
        0,
        100,
        METABALLS.edgeLightness,
        true,
      );
      METABALLS.edgeAlpha = clampNumber(
        savedMetaballs.edgeAlpha,
        0,
        1,
        METABALLS.edgeAlpha,
      );
      METABALLS.glowHue = clampNumber(
        savedMetaballs.glowHue,
        0,
        360,
        METABALLS.glowHue,
        true,
      );
      METABALLS.glowSaturation = clampNumber(
        savedMetaballs.glowSaturation,
        0,
        100,
        METABALLS.glowSaturation,
        true,
      );
      METABALLS.glowLightness = clampNumber(
        savedMetaballs.glowLightness,
        0,
        100,
        METABALLS.glowLightness,
        true,
      );
      METABALLS.glowAlpha = clampNumber(
        savedMetaballs.glowAlpha,
        0,
        1,
        METABALLS.glowAlpha,
      );
      METABALLS.glowBlur = clampNumber(
        savedMetaballs.glowBlur,
        0,
        50,
        METABALLS.glowBlur,
      );
      METABALLS.edgeWidth = clampNumber(
        savedMetaballs.edgeWidth,
        0,
        4,
        METABALLS.edgeWidth,
      );
    }

    const savedWorld = parsed.world;
    if (savedWorld && typeof savedWorld === "object") {
      WORLD.surfaceRestitution = clampNumber(
        savedWorld.surfaceRestitution,
        0,
        1,
        WORLD.surfaceRestitution,
      );
      WORLD.stationaryBottomHoleWidth = clampNumber(
        savedWorld.stationaryBottomHoleWidth,
        0,
        260,
        WORLD.stationaryBottomHoleWidth,
        true,
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
        repulsionRadius: WATER.repulsionRadius,
        repulsionStrength: WATER.repulsionStrength,
        cupDamping: WATER.cupDamping,
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
        stationaryBottomHoleWidth: WORLD.stationaryBottomHoleWidth,
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
    return decimalIndex === -1
      ? 0
      : Math.min(stepText.length - decimalIndex - 1, 6);
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
      value.textContent = formatSliderValue(
        control.get(),
        control.step,
        control.formatter,
      );
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
            max: 30000,
            step: 10,
            get: () => WATER.maxBodies,
            set: (value) => {
              WATER.maxBodies = Math.round(value);
              trimWaterBodiesToLimit();
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
              setWaterRestitution(value);
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
            id: "stationary-bottom-hole",
            label: "stationary bottom hole",
            min: 0,
            max: 260,
            step: 1,
            get: () => WORLD.stationaryBottomHoleWidth,
            set: (value) => {
              WORLD.stationaryBottomHoleWidth = Math.round(value);
              buildWorld();
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
          {
            id: "repulsion-radius",
            label: "repulsion radius",
            min: 0,
            max: 8,
            step: 0.1,
            get: () => WATER.repulsionRadius,
            set: (value) => {
              WATER.repulsionRadius = value;
            },
          },
          {
            id: "repulsion-strength",
            label: "repulsion strength",
            min: 0,
            max: 0.01,
            step: 0.0001,
            get: () => WATER.repulsionStrength,
            set: (value) => {
              WATER.repulsionStrength = value;
            },
          },
          {
            id: "cup-damping",
            label: "cup damping",
            min: 0,
            max: 1,
            step: 0.01,
            get: () => WATER.cupDamping,
            set: (value) => {
              WATER.cupDamping = value;
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
            max: 3000,
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
    environmentBodySet.clear();
    cupBodySet.clear();
    blackHoleBodySet.clear();

    if (centerPlatform) {
      Composite.remove(engine.world, centerPlatform);
      centerPlatform = null;
    }

    if (drainSensor) {
      Composite.remove(engine.world, drainSensor);
      drainSensor = null;
    }

    draggablePlatforms.forEach((body) => Composite.remove(engine.world, body));
    draggablePlatforms = [];
    activeDraggablePlatform = null;
  }

  function registerScoringSurfaces() {
    environmentBodySet.clear();
    cupBodySet.clear();
    blackHoleBodySet.clear();

    boundaries.forEach((body) => environmentBodySet.add(body));
    if (drainSensor) {
      blackHoleBodySet.add(drainSensor);
    }
    if (centerPlatform) {
      cupBodySet.add(centerPlatform);
    }
    draggablePlatforms.forEach((platform) => {
      if (platform.toolType === "blackHole") {
        blackHoleBodySet.add(platform);
      } else {
        cupBodySet.add(platform);
      }
    });
  }

  function gapIntervals(gaps, length) {
    if (!Array.isArray(gaps)) {
      return [];
    }

    return gaps
      .map((gap) => {
        const gapCenter = clamp(gap.center || 0, -0.5, 0.5) * length;
        const gapLength = clamp(gap.width || gap.height || 0, 0, 0.9) * length;
        return {
          min: clamp(gapCenter - gapLength / 2, -length / 2, length / 2),
          max: clamp(gapCenter + gapLength / 2, -length / 2, length / 2),
        };
      })
      .filter((gap) => gap.max - gap.min > 1)
      .sort((a, b) => a.min - b.min);
  }

  function addSegmentedRectangleParts({
    parts,
    centerX,
    centerY,
    length,
    thickness,
    angle = 0,
    axis = "x",
    gaps = [],
    options,
  }) {
    const intervals = gapIntervals(gaps, length);
    let cursor = -length / 2;

    intervals.forEach((gap) => {
      addSegment(cursor, gap.min);
      cursor = Math.max(cursor, gap.max);
    });

    addSegment(cursor, length / 2);

    function addSegment(start, end) {
      const segmentLength = end - start;
      if (segmentLength <= 1) {
        return;
      }

      const offset = (start + end) / 2;
      const segmentX =
        centerX +
        (axis === "x" ? Math.cos(angle) * offset : -Math.sin(angle) * offset);
      const segmentY =
        centerY +
        (axis === "x" ? Math.sin(angle) * offset : Math.cos(angle) * offset);
      const segmentWidth = axis === "x" ? segmentLength : thickness;
      const segmentHeight = axis === "x" ? thickness : segmentLength;

      parts.push(
        Bodies.rectangle(segmentX, segmentY, segmentWidth, segmentHeight, {
          ...options,
          angle,
        }),
      );
    }
  }

  function createUPlatform({
    x,
    y,
    width,
    height,
    thickness,
    bottomGap = 0,
    bottomGaps = null,
    leftSideGaps = null,
    rightSideGaps = null,
    sideLean = 0,
    friction,
    fillStyle,
    strokeStyle,
  }) {
    const partOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    };

    const sideHeight = Math.max(thickness * 2, height);
    const bottomHolePattern =
      bottomGaps ||
      (bottomGap > 0 ? [{ center: 0, width: bottomGap / width }] : []);
    const leftX = x - width / 2 + thickness / 2;
    const rightX = x + width / 2 - thickness / 2;
    const bottomY = y + sideHeight / 2 - thickness / 2;

    const parts = [];
    addSegmentedRectangleParts({
      parts,
      centerX: leftX,
      centerY: y,
      length: sideHeight,
      thickness,
      angle: -sideLean,
      axis: "y",
      gaps: leftSideGaps,
      options: partOptions,
    });
    addSegmentedRectangleParts({
      parts,
      centerX: rightX,
      centerY: y,
      length: sideHeight,
      thickness,
      angle: sideLean,
      axis: "y",
      gaps: rightSideGaps,
      options: partOptions,
    });
    addSegmentedRectangleParts({
      parts,
      centerX: x,
      centerY: bottomY,
      length: width,
      thickness,
      axis: "x",
      gaps: bottomHolePattern,
      options: partOptions,
    });

    const platform = Body.create({
      isStatic: true,
      friction,
      restitution: WORLD.surfaceRestitution,
      parts,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    });

    Body.setStatic(platform, true);
    return platform;
  }

  function createRoundCup({
    x,
    y,
    width,
    height,
    thickness,
    startAngle,
    endAngle,
    beadScale = 0.55,
    holeGaps = [],
    friction,
    fillStyle,
    strokeStyle,
  }) {
    const beadRadius = Math.max(4, thickness * beadScale);
    const radiusX = Math.max(beadRadius * 3, width / 2 - beadRadius);
    const radiusY = Math.max(beadRadius * 3, height / 2 - beadRadius);
    const arcStart = startAngle ?? Math.PI * 0.08;
    const arcEnd = endAngle ?? Math.PI * 0.92;
    const arcLength = Math.max(radiusX, radiusY) * Math.abs(arcEnd - arcStart);
    const beadCount = Math.max(12, Math.ceil(arcLength / (beadRadius * 1.18)));
    const holes = Array.isArray(holeGaps)
      ? holeGaps
          .map((gap) => {
            const center = clamp(gap.center || 0, 0, 1);
            const width = clamp(gap.width || 0, 0, 0.35);
            return {
              min: clamp(center - width / 2, 0, 1),
              max: clamp(center + width / 2, 0, 1),
            };
          })
          .filter((gap) => gap.max - gap.min > 0.005)
      : [];
    const partOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    };
    const parts = [];

    for (let i = 0; i <= beadCount; i += 1) {
      const t = i / beadCount;
      const isHole = holes.some((hole) => t >= hole.min && t <= hole.max);
      if (isHole) {
        continue;
      }

      const angle = arcStart + (arcEnd - arcStart) * t;
      parts.push(
        Bodies.circle(
          x + Math.cos(angle) * radiusX,
          y + Math.sin(angle) * radiusY,
          beadRadius,
          {
            ...partOptions,
          },
        ),
      );
    }

    const platform = Body.create({
      isStatic: true,
      friction,
      restitution: WORLD.surfaceRestitution,
      parts,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    });

    Body.setStatic(platform, true);
    return platform;
  }

  function createPolygonCup({
    x,
    y,
    width,
    height,
    thickness,
    points,
    friction,
    fillStyle,
    strokeStyle,
  }) {
    const partOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    };
    const vertices = Array.isArray(points)
      ? points.map((point) => ({
          x: x + point.x * width,
          y: y + point.y * height,
        }))
      : [];
    const parts = [];

    for (let i = 0; i < vertices.length - 1; i += 1) {
      const start = vertices[i];
      const end = vertices[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);

      if (length <= 1) {
        continue;
      }

      parts.push(
        Bodies.rectangle(
          (start.x + end.x) / 2,
          (start.y + end.y) / 2,
          length,
          thickness,
          {
            ...partOptions,
            angle: Math.atan2(dy, dx),
          },
        ),
      );
    }

    vertices.forEach((point) => {
      parts.push(Bodies.circle(point.x, point.y, thickness / 2, partOptions));
    });

    const platform = Body.create({
      isStatic: true,
      friction,
      restitution: WORLD.surfaceRestitution,
      parts,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    });

    Body.setStatic(platform, true);
    return platform;
  }

  function createDmacCup({
    x,
    y,
    width,
    height,
    thickness,
    friction,
    fillStyle,
    strokeStyle,
    pinStyle,
    busStyle,
  }) {
    const wallOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    };
    const pinOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle: pinStyle,
        strokeStyle: "#fff2a8",
        lineWidth: 1.5,
      },
    };
    const busOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle: busStyle,
        strokeStyle: "#a9dbff",
        lineWidth: 1.5,
      },
    };
    const sideHeight = Math.max(thickness * 2, height);
    const leftX = x - width / 2 + thickness / 2;
    const rightX = x + width / 2 - thickness / 2;
    const bottomY = y + sideHeight / 2 - thickness / 2;
    const parts = [
      Bodies.rectangle(leftX, y, thickness, sideHeight, wallOptions),
      Bodies.rectangle(rightX, y, thickness, sideHeight, wallOptions),
      Bodies.rectangle(x, bottomY, width, thickness, busOptions),
    ];
    const pinCount = 5;
    const pinWidth = thickness * 0.65;
    const pinHeight = thickness * 1.3;

    for (let i = 0; i < pinCount; i += 1) {
      const t = pinCount === 1 ? 0.5 : i / (pinCount - 1);
      const pinY = y - sideHeight * 0.31 + t * sideHeight * 0.62;
      parts.push(
        Bodies.rectangle(
          leftX - thickness * 0.78,
          pinY,
          pinWidth,
          pinHeight,
          pinOptions,
        ),
        Bodies.rectangle(
          rightX + thickness * 0.78,
          pinY,
          pinWidth,
          pinHeight,
          pinOptions,
        ),
      );
    }

    for (let i = -1; i <= 1; i += 1) {
      parts.push(
        Bodies.rectangle(
          x + i * width * 0.22,
          bottomY - thickness * 0.68,
          width * 0.16,
          thickness * 0.36,
          busOptions,
        ),
      );
    }

    const platform = Body.create({
      isStatic: true,
      friction,
      restitution: WORLD.surfaceRestitution,
      parts,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    });

    Body.setStatic(platform, true);
    return platform;
  }

  function createCaleyCup({
    x,
    y,
    width,
    height,
    thickness,
    friction,
    fillStyle,
    strokeStyle,
    sensorStyle,
    dataStyle,
  }) {
    const wallOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    };
    const sensorOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle: sensorStyle,
        strokeStyle: "#dffcff",
        lineWidth: 1.5,
      },
    };
    const dataOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle: dataStyle,
        strokeStyle: "#fff2a8",
        lineWidth: 1.5,
      },
    };
    const sideHeight = Math.max(thickness * 2, height);
    const leftX = x - width / 2 + thickness / 2;
    const rightX = x + width / 2 - thickness / 2;
    const bottomY = y + sideHeight / 2 - thickness / 2;
    const parts = [
      Bodies.rectangle(leftX, y, thickness, sideHeight, wallOptions),
      Bodies.rectangle(rightX, y, thickness, sideHeight, wallOptions),
      Bodies.rectangle(x, bottomY, width, thickness, wallOptions),
      Bodies.rectangle(
        x,
        y - sideHeight * 0.48,
        thickness * 0.46,
        sideHeight * 0.22,
        dataOptions,
      ),
      Bodies.circle(x, y - sideHeight * 0.62, thickness * 0.48, sensorOptions),
    ];
    const nodeY = bottomY - thickness * 0.85;
    const nodeRadius = thickness * 0.32;
    const nodeOffsets = [-0.26, 0, 0.26];

    nodeOffsets.forEach((offset) => {
      parts.push(
        Bodies.circle(x + width * offset, nodeY, nodeRadius, dataOptions),
      );
    });

    parts.push(
      Bodies.rectangle(
        x - width * 0.13,
        nodeY,
        width * 0.2,
        thickness * 0.22,
        dataOptions,
      ),
      Bodies.rectangle(
        x + width * 0.13,
        nodeY,
        width * 0.2,
        thickness * 0.22,
        dataOptions,
      ),
      Bodies.circle(
        leftX + thickness * 1.05,
        y - sideHeight * 0.18,
        thickness * 0.42,
        sensorOptions,
      ),
      Bodies.circle(
        rightX - thickness * 1.05,
        y - sideHeight * 0.18,
        thickness * 0.42,
        sensorOptions,
      ),
    );

    const platform = Body.create({
      isStatic: true,
      friction,
      restitution: WORLD.surfaceRestitution,
      parts,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    });

    Body.setStatic(platform, true);
    return platform;
  }

  function createPlug({
    x,
    y,
    width,
    height,
    thickness,
    friction,
    fillStyle,
    strokeStyle,
    bandStyle,
  }) {
    const radius = Math.max(thickness, Math.min(width, height) / 2);
    const capOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    };
    const bandOptions = {
      friction,
      restitution: WORLD.surfaceRestitution,
      render: {
        fillStyle: bandStyle,
        strokeStyle,
        lineWidth: 1.5,
      },
    };
    const parts = [
      Bodies.circle(x, y, radius, capOptions),
      Bodies.rectangle(x, y, radius * 1.45, thickness * 0.48, bandOptions),
      Bodies.rectangle(x, y, thickness * 0.48, radius * 1.45, bandOptions),
      Bodies.rectangle(
        x,
        y + radius * 0.58,
        radius * 1.22,
        thickness * 0.6,
        capOptions,
      ),
    ];
    const platform = Body.create({
      isStatic: true,
      friction,
      restitution: WORLD.surfaceRestitution,
      parts,
      render: {
        fillStyle,
        strokeStyle,
        lineWidth: 2,
      },
    });

    Body.setStatic(platform, true);
    return platform;
  }

  function cupBuildMetrics() {
    const width = render.options.width;
    const height = render.options.height;
    const cupScale = WORLD.cupScale;
    return {
      worldWidth: width,
      worldHeight: height,
      baseWidth: Math.max(110, Math.min(width * 0.3, 230)) * cupScale,
      baseHeight: WORLD.draggablePlatformHeight * cupScale,
      thickness: WORLD.platformThickness * cupScale,
    };
  }

  function createMovableCupPlatform(
    layout,
    state,
    index,
    metrics = cupBuildMetrics(),
  ) {
    const cupOptions = {
      x: state.xRatio * metrics.worldWidth,
      y: state.yRatio * metrics.worldHeight,
      width: metrics.baseWidth * layout.widthScale,
      height: metrics.baseHeight * layout.heightScale,
      thickness: metrics.thickness,
      friction: 0.32,
      fillStyle: layout.fillStyle,
      strokeStyle: layout.strokeStyle,
    };
    let platform;

    if (layout.shape === "round") {
      platform = createRoundCup({
        ...cupOptions,
        startAngle: layout.startAngle,
        endAngle: layout.endAngle,
        beadScale: layout.beadScale,
        holeGaps: layout.holeGaps,
      });
    } else if (layout.shape === "polygon") {
      platform = createPolygonCup({
        ...cupOptions,
        points: layout.points,
      });
    } else if (layout.shape === "dmac") {
      platform = createDmacCup({
        ...cupOptions,
        pinStyle: layout.pinStyle,
        busStyle: layout.busStyle,
      });
    } else if (layout.shape === "caley") {
      platform = createCaleyCup({
        ...cupOptions,
        sensorStyle: layout.sensorStyle,
        dataStyle: layout.dataStyle,
      });
    } else if (layout.shape === "plug") {
      platform = createPlug({
        ...cupOptions,
        bandStyle: layout.bandStyle,
      });
    } else {
      platform = createUPlatform({
        ...cupOptions,
        bottomGaps: layout.bottomGaps,
        leftSideGaps: layout.leftSideGaps,
        rightSideGaps: layout.rightSideGaps,
        sideLean: layout.sideLean,
      });
    }

    platform.cupIndex = index;
    platform.toolType = layout.shape || "cup";
    Body.setAngle(platform, state.angle);
    return platform;
  }

  function syncCupStateFromPlatform(platform) {
    if (!platform || platform.cupIndex === undefined) {
      return;
    }

    const state = spawnedCupStates[platform.cupIndex];
    if (!state) {
      return;
    }

    state.xRatio = clamp(platform.position.x / render.options.width, 0, 1);
    state.yRatio = clamp(platform.position.y / render.options.height, 0, 1);
    state.angle = platform.angle;
  }

  function plugLayoutIndex() {
    return MOVABLE_CUP_LAYOUTS.findIndex((layout) => layout.shape === "plug");
  }

  function drainPlugState() {
    const layoutIndex = plugLayoutIndex();
    return {
      layoutIndex,
      xRatio: 0.5,
      yRatio: 0.985,
      angle: 0,
      lockedToDrain: true,
    };
  }

  function nextCupSpawnState(layoutIndex) {
    const layout = MOVABLE_CUP_LAYOUTS[layoutIndex];
    const spawnSlots = [
      { xRatio: 0.18, yRatio: 0.24 },
      { xRatio: 0.32, yRatio: 0.26 },
      { xRatio: 0.46, yRatio: 0.24 },
      { xRatio: 0.6, yRatio: 0.26 },
      { xRatio: 0.74, yRatio: 0.24 },
      { xRatio: 0.88, yRatio: 0.3 },
    ];
    const slot = spawnSlots[spawnedCupStates.length % spawnSlots.length];
    const rowOffset =
      Math.floor(spawnedCupStates.length / spawnSlots.length) * 0.08;

    return {
      layoutIndex,
      xRatio: slot.xRatio,
      yRatio: clamp(slot.yRatio + rowOffset, 0.16, 0.78),
      angle: layout.angle || 0,
    };
  }

  function spawnCupFromDrawer(layoutIndex) {
    const layout = MOVABLE_CUP_LAYOUTS[layoutIndex];
    if (!layout) {
      return;
    }

    const state = nextCupSpawnState(layoutIndex);
    const index = spawnedCupStates.length;
    spawnedCupStates.push(state);

    const platform = createMovableCupPlatform(layout, state, index);
    draggablePlatforms.push(platform);
    Composite.add(engine.world, platform);
    setActiveDraggablePlatform(platform);
    registerScoringSurfaces();
  }

  function removeSelectedCup() {
    const platform = activeDraggablePlatform;
    if (!platform || platform.cupIndex === undefined) {
      return;
    }

    const index = platform.cupIndex;
    spawnedCupStates.splice(index, 1);
    draggablePlatforms.splice(index, 1);
    Composite.remove(engine.world, platform);

    draggablePlatforms.forEach((body, nextIndex) => {
      body.cupIndex = nextIndex;
    });

    if (activePointerId !== null && isDraggingPlatform) {
      isDraggingPlatform = false;
      dragOffset = { x: 0, y: 0 };
      dragTarget = null;
    }

    activeDraggableIndex = clamp(index - 1, 0, draggablePlatforms.length - 1);
    activeDraggablePlatform = draggablePlatforms[activeDraggableIndex] || null;
    registerScoringSurfaces();
  }

  function buildCupDrawer() {
    if (!cupList) {
      return;
    }

    cupList.textContent = "";
    const removeButton = document.createElement("button");
    const removeSwatch = document.createElement("span");
    const removeLabel = document.createElement("span");

    removeButton.type = "button";
    removeButton.className = "cup-button cup-remove-button";
    removeButton.title = "Remove selected cup or tool";
    removeSwatch.className = "cup-swatch";
    removeLabel.textContent = "Remove Selected";
    removeButton.append(removeSwatch, removeLabel);
    removeButton.addEventListener("click", removeSelectedCup);
    cupList.appendChild(removeButton);

    MOVABLE_CUP_LAYOUTS.forEach((layout, index) => {
      if (layout.drawer === false) {
        return;
      }

      const button = document.createElement("button");
      const swatch = document.createElement("span");
      const label = document.createElement("span");

      button.type = "button";
      button.className = "cup-button";
      button.title = `Spawn ${layout.label || layout.id}`;
      swatch.className = "cup-swatch";
      swatch.style.background = layout.fillStyle;
      label.textContent = layout.label || layout.id;

      button.append(swatch, label);
      button.addEventListener("click", () => spawnCupFromDrawer(index));
      cupList.appendChild(button);
    });
  }

  function buildWorld() {
    removeWorldBodies();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const wt = WORLD.wallThickness;

    const drainWidth = Math.max(70, Math.min(WORLD.drainWidth, width * 0.28));
    const drainX = width / 2;
    const floorTop = height;
    const floorBottom = height + WORLD.floorHeight;
    const floorOptions = {
      isStatic: true,
      friction: 0.25,
      restitution: WORLD.surfaceRestitution,
      render: { fillStyle: "#5f7f93" },
    };
    const leftFloorStart = -wt;
    const leftFloorEnd = drainX - drainWidth / 2;
    const rightFloorStart = drainX + drainWidth / 2;
    const rightFloorEnd = width + wt;
    const leftFloor = Bodies.rectangle(
      (leftFloorStart + leftFloorEnd) / 2,
      height + WORLD.floorHeight / 2,
      leftFloorEnd - leftFloorStart,
      WORLD.floorHeight,
      floorOptions,
    );
    const rightFloor = Bodies.rectangle(
      (rightFloorStart + rightFloorEnd) / 2,
      height + WORLD.floorHeight / 2,
      rightFloorEnd - rightFloorStart,
      WORLD.floorHeight,
      floorOptions,
    );
    const drainLipOptions = {
      isStatic: true,
      friction: 0.25,
      restitution: WORLD.surfaceRestitution,
      render: { fillStyle: "#233f55" },
    };
    const drainLeftLip = Bodies.rectangle(
      leftFloorEnd,
      floorTop + WORLD.floorHeight * 0.18,
      12,
      WORLD.floorHeight * 0.36,
      drainLipOptions,
    );
    const drainRightLip = Bodies.rectangle(
      rightFloorStart,
      floorTop + WORLD.floorHeight * 0.18,
      12,
      WORLD.floorHeight * 0.36,
      drainLipOptions,
    );
    drainSensor = Bodies.rectangle(
      drainX,
      floorBottom - WORLD.floorHeight * 0.12,
      drainWidth * 0.9,
      WORLD.floorHeight * 0.5,
      {
        isStatic: true,
        isSensor: true,
        render: {
          visible: false,
        },
      },
    );

    const leftWall = Bodies.rectangle(-wt / 2, height / 2, wt, height * 2, {
      isStatic: true,
      restitution: WORLD.surfaceRestitution,
      render: { fillStyle: "#355265" },
    });

    const rightWall = Bodies.rectangle(
      width + wt / 2,
      height / 2,
      wt,
      height * 2,
      {
        isStatic: true,
        restitution: WORLD.surfaceRestitution,
        render: { fillStyle: "#355265" },
      },
    );

    const platformY = height * (2 / 3);
    const cupScale = WORLD.cupScale;
    const platformThickness = WORLD.platformThickness * cupScale;
    const platformWidth = Math.max(180, Math.min(width * 0.62, 500)) * cupScale;
    const stationaryPlatformBaseHeight =
      WORLD.stationaryPlatformHeight * cupScale;
    const stationaryPlatformHeight = stationaryPlatformBaseHeight * 3;
    const stationaryPlatformY =
      platformY - (stationaryPlatformHeight - stationaryPlatformBaseHeight) / 2;

    centerPlatform = createUPlatform({
      x: width / 2,
      y: stationaryPlatformY,
      width: platformWidth,
      height: stationaryPlatformHeight,
      thickness: platformThickness,
      bottomGap: WORLD.stationaryBottomHoleWidth * cupScale,
      friction: 0.35,
      fillStyle: "#e0bc7a",
      strokeStyle: "#f6dbab",
    });

    const metrics = cupBuildMetrics();
    draggablePlatforms = spawnedCupStates
      .map((state, index) => {
        const layout = MOVABLE_CUP_LAYOUTS[state.layoutIndex];
        return layout
          ? createMovableCupPlatform(layout, state, index, metrics)
          : null;
      })
      .filter(Boolean);
    activeDraggableIndex = clamp(
      activeDraggableIndex,
      0,
      draggablePlatforms.length - 1,
    );
    activeDraggablePlatform = draggablePlatforms[activeDraggableIndex] || null;

    boundaries = [
      leftFloor,
      rightFloor,
      drainLeftLip,
      drainRightLip,
      leftWall,
      rightWall,
    ];
    Composite.add(engine.world, [
      ...boundaries,
      drainSensor,
      centerPlatform,
      ...draggablePlatforms,
    ]);
    registerScoringSurfaces();
  }

  function setWorldSurfaceRestitution(value) {
    WORLD.surfaceRestitution = value;

    boundaries.forEach((body) => {
      body.restitution = value;
    });

    if (centerPlatform) {
      centerPlatform.restitution = value;
      centerPlatform.parts.forEach((part) => {
        part.restitution = value;
      });
    }

    draggablePlatforms.forEach((platform) => {
      platform.restitution = value;
      platform.parts.forEach((part) => {
        part.restitution = value;
      });
    });
  }

  function setWaterRestitution(value) {
    WATER.restitution = value;

    waterBodies.forEach((body) => {
      body.restitution = value;
    });
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
    metaballField.values = new Float32Array(
      metaballField.cols * metaballField.rows,
    );
    metaballField.maxCol = -1;
    metaballField.maxRow = -1;
  }

  function sampleMetaballBodies() {
    metaballSampleBuffer.length = 0;
    const width = render.options.width;
    const height = render.options.height;
    const margin = METABALLS.cullMargin;
    const maxParticles = Math.max(1, Math.round(METABALLS.maxParticles));
    let visibleCount = 0;

    for (let i = 0; i < waterBodies.length; i += 1) {
      const body = waterBodies[i];
      const { x, y } = body.position;

      if (
        x < -margin ||
        x > width + margin ||
        y < -margin ||
        y > height + margin
      ) {
        continue;
      }

      visibleCount += 1;
    }

    if (visibleCount === 0) {
      return metaballSampleBuffer;
    }

    const step = Math.max(1, visibleCount / maxParticles);
    let visibleIndex = 0;
    let nextSampleIndex = 0;

    for (let i = 0; i < waterBodies.length; i += 1) {
      const body = waterBodies[i];
      const { x, y } = body.position;

      if (
        x < -margin ||
        x > width + margin ||
        y < -margin ||
        y > height + margin
      ) {
        continue;
      }

      if (
        visibleCount <= maxParticles ||
        visibleIndex >= Math.floor(nextSampleIndex)
      ) {
        metaballSampleBuffer.push(body);
        nextSampleIndex += step;

        if (metaballSampleBuffer.length >= maxParticles) {
          break;
        }
      }

      visibleIndex += 1;
    }

    return metaballSampleBuffer;
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

      const startCol = Math.max(
        0,
        Math.floor((x - influenceRadius) / cellSize),
      );
      const endCol = Math.min(
        cols - 1,
        Math.ceil((x + influenceRadius) / cellSize),
      );
      const startRow = Math.max(
        0,
        Math.floor((y - influenceRadius) / cellSize),
      );
      const endRow = Math.min(
        rows - 1,
        Math.ceil((y + influenceRadius) / cellSize),
      );

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
    if (
      metaballField.maxCol < metaballField.minCol ||
      metaballField.maxRow < metaballField.minRow
    ) {
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
          vd,
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

    if (body.parts && body.parts.length > 1) {
      for (let i = 1; i < body.parts.length; i += 1) {
        const part = body.parts[i];
        if (
          Bounds.contains(part.bounds, point) &&
          Vertices.contains(part.vertices, point)
        ) {
          return true;
        }
      }

      return false;
    }

    return (
      Bounds.contains(body.bounds, point) &&
      Vertices.contains(body.vertices, point)
    );
  }

  function findDraggablePlatformAtPoint(point) {
    for (let i = draggablePlatforms.length - 1; i >= 0; i -= 1) {
      if (isPointInsideBody(point, draggablePlatforms[i])) {
        return draggablePlatforms[i];
      }
    }

    return null;
  }

  function setActiveDraggablePlatform(platform) {
    if (!platform) {
      return;
    }

    activeDraggablePlatform = platform;
    activeDraggableIndex = platform.cupIndex || 0;
  }

  function clampedDraggablePlatformPosition(
    pointerWorldPoint,
    platform = activeDraggablePlatform,
  ) {
    if (!platform) {
      return null;
    }

    const halfWidth = (platform.bounds.max.x - platform.bounds.min.x) / 2;
    const halfHeight = (platform.bounds.max.y - platform.bounds.min.y) / 2;

    const x = clamp(
      pointerWorldPoint.x - dragOffset.x,
      halfWidth + 10,
      render.options.width - halfWidth - 10,
    );

    const maxY =
      platform.toolType === "plug"
        ? render.options.height + halfHeight * 0.15
        : render.options.height - halfHeight - 10;
    const y = clamp(pointerWorldPoint.y - dragOffset.y, halfHeight + 10, maxY);

    return { x, y };
  }

  function moveDraggablePlatform(pointerWorldPoint) {
    dragTarget = clampedDraggablePlatformPosition(pointerWorldPoint);
  }

  function draggablePlatformCollidesWithCup(platform) {
    if (!platform || !centerPlatform) {
      return false;
    }

    const otherCups = draggablePlatforms.filter(
      (candidate) => candidate !== platform,
    );
    return Query.collides(platform, [centerPlatform, ...otherCups]).length > 0;
  }

  function canPlaceDraggablePlatform(
    platform,
    position,
    angle = platform ? platform.angle : 0,
  ) {
    if (!platform) {
      return false;
    }

    const previousPosition = { ...platform.position };
    const previousAngle = platform.angle;

    Body.setPosition(platform, position, false);
    Body.setAngle(platform, angle, false);
    const hasCupCollision = draggablePlatformCollidesWithCup(platform);
    Body.setAngle(platform, previousAngle, false);
    Body.setPosition(platform, previousPosition, false);

    return !hasCupCollision;
  }

  function safeDraggablePlatformTransform(
    platform,
    targetPosition,
    targetAngle = platform ? platform.angle : 0,
  ) {
    if (!platform || !targetPosition) {
      return null;
    }

    const startPosition = { ...platform.position };
    const startAngle = platform.angle;
    const dx = targetPosition.x - startPosition.x;
    const dy = targetPosition.y - startPosition.y;
    const angleDelta = targetAngle - startAngle;
    const distance = Math.hypot(dx, dy);
    const maxTranslationStep = Math.max(1, WORLD.draggableCollisionStep);
    const maxAngleStep = Math.max(0.001, WORLD.draggableCollisionAngleStep);
    const steps = Math.max(
      1,
      Math.ceil(distance / maxTranslationStep),
      Math.ceil(Math.abs(angleDelta) / maxAngleStep),
    );
    let safePosition = startPosition;
    let safeAngle = startAngle;

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const candidatePosition = {
        x: startPosition.x + dx * t,
        y: startPosition.y + dy * t,
      };
      const candidateAngle = startAngle + angleDelta * t;

      if (
        !canPlaceDraggablePlatform(platform, candidatePosition, candidateAngle)
      ) {
        break;
      }

      safePosition = candidatePosition;
      safeAngle = candidateAngle;
    }

    return {
      position: safePosition,
      angle: safeAngle,
      moved:
        Math.hypot(
          safePosition.x - startPosition.x,
          safePosition.y - startPosition.y,
        ) > 0.001 || Math.abs(safeAngle - startAngle) > 0.0001,
    };
  }

  function settleDraggablePlatform(platform = activeDraggablePlatform) {
    if (!platform) {
      return;
    }

    Body.setVelocity(platform, { x: 0, y: 0 });
    Body.setAngularVelocity(platform, 0);
    syncCupStateFromPlatform(platform);
  }

  function stepDraggablePlatform() {
    const platform = activeDraggablePlatform;
    if (!isDraggingPlatform || !platform || !dragTarget) {
      return;
    }

    const dx = dragTarget.x - platform.position.x;
    const dy = dragTarget.y - platform.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.001) {
      settleDraggablePlatform(platform);
      return;
    }

    const maxStep = Math.max(1, WORLD.draggableMaxStep);
    const scale = Math.min(1, maxStep / distance);
    const nextPosition = {
      x: platform.position.x + dx * scale,
      y: platform.position.y + dy * scale,
    };

    const safeTransform = safeDraggablePlatformTransform(
      platform,
      nextPosition,
    );
    if (!safeTransform || !safeTransform.moved) {
      settleDraggablePlatform(platform);
      return;
    }

    Body.setPosition(platform, safeTransform.position, true);
    Body.setAngularVelocity(platform, 0);
    syncCupStateFromPlatform(platform);
  }

  function stepDraggablePlatformMove(deltaMs) {
    const platform = activeDraggablePlatform;
    const dx = (moveKeys.right ? 1 : 0) - (moveKeys.left ? 1 : 0);
    const dy = (moveKeys.down ? 1 : 0) - (moveKeys.up ? 1 : 0);
    if (!platform || (dx === 0 && dy === 0)) {
      return;
    }

    const dt = Math.min(Math.max(deltaMs || 1000 / 60, 0), 34) / 1000;
    const speed = WORLD.keyMoveSpeed;
    const nextPosition = {
      x: platform.position.x + dx * speed * dt,
      y: platform.position.y + dy * speed * dt,
    };

    const safeTransform = safeDraggablePlatformTransform(
      platform,
      nextPosition,
    );
    if (!safeTransform || !safeTransform.moved) {
      return;
    }

    Body.setPosition(platform, safeTransform.position, true);
    Body.setAngularVelocity(platform, 0);
    syncCupStateFromPlatform(platform);
  }

  function stepDraggablePlatformTilt(deltaMs) {
    const platform = activeDraggablePlatform;
    if (!platform || tiltInput === 0) {
      return;
    }

    const dt = Math.min(Math.max(deltaMs || 1000 / 60, 0), 34) / 1000;
    const nextAngle = platform.angle + tiltInput * WORLD.draggableTiltRate * dt;

    const safeTransform = safeDraggablePlatformTransform(
      platform,
      platform.position,
      nextAngle,
    );
    if (!safeTransform || !safeTransform.moved) {
      Body.setAngularVelocity(platform, 0);
      syncCupStateFromPlatform(platform);
      return;
    }

    Body.setAngle(platform, safeTransform.angle, true);
    syncCupStateFromPlatform(platform);
  }

  function rootCollisionBody(body) {
    return body && body.parent ? body.parent : body;
  }

  function addScore(points) {
    score += points;
  }

  function scoreParticleCupTouch(body) {
    if (!body.scoreState || body.scoreState.touchedCup) {
      return;
    }

    body.scoreState.touchedCup = true;
    addScore(SCORE_VALUES.cupTouch);
  }

  function scoreParticleEnvironmentTouch(body) {
    if (!body.scoreState || body.scoreState.touchedEnvironment) {
      return;
    }

    body.scoreState.touchedEnvironment = true;
    addScore(SCORE_VALUES.environmentTouch);
  }

  function scoreParticleSplash(bodyA, bodyB) {
    if (!bodyA.scoreState || !bodyB.scoreState) {
      return;
    }

    if (
      bodyA.scoreState.splashes >= SCORE_VALUES.maxSplashesPerDrop ||
      bodyB.scoreState.splashes >= SCORE_VALUES.maxSplashesPerDrop
    ) {
      return;
    }

    bodyA.scoreState.splashes += 1;
    bodyB.scoreState.splashes += 1;
    addScore(SCORE_VALUES.particleSplash);
  }

  function scoreCollisionPair(bodyA, bodyB) {
    const rootA = rootCollisionBody(bodyA);
    const rootB = rootCollisionBody(bodyB);
    const aIsWater = waterBodySet.has(rootA);
    const bIsWater = waterBodySet.has(rootB);

    if (aIsWater && bIsWater) {
      scoreParticleSplash(rootA, rootB);
      return;
    }

    const waterBody = aIsWater ? rootA : bIsWater ? rootB : null;
    const otherBody = aIsWater ? rootB : bIsWater ? rootA : null;
    if (!waterBody || !otherBody) {
      return;
    }

    if (cupBodySet.has(otherBody)) {
      scoreParticleCupTouch(waterBody);
    } else if (environmentBodySet.has(otherBody)) {
      scoreParticleEnvironmentTouch(waterBody);
    }
  }

  function queueBlackHoleDeletion(bodyA, bodyB) {
    const rootA = rootCollisionBody(bodyA);
    const rootB = rootCollisionBody(bodyB);
    const aIsBlackHole = blackHoleBodySet.has(rootA);
    const bIsBlackHole = blackHoleBodySet.has(rootB);

    if (aIsBlackHole && waterBodySet.has(rootB)) {
      blackHoleDeletionQueue.add(rootB);
    } else if (bIsBlackHole && waterBodySet.has(rootA)) {
      blackHoleDeletionQueue.add(rootA);
    }
  }

  function removeWaterBody(body) {
    const index = waterBodies.indexOf(body);
    if (index === -1) {
      return;
    }

    removeWaterBodies(index, 1);
  }

  function removeQueuedBlackHoleParticles() {
    if (blackHoleDeletionQueue.size === 0) {
      return;
    }

    blackHoleDeletionQueue.forEach((body) => removeWaterBody(body));
    blackHoleDeletionQueue.clear();
  }

  function removeWaterBodies(startIndex, deleteCount) {
    if (deleteCount <= 0) {
      return;
    }

    const removed = waterBodies.splice(startIndex, deleteCount);
    for (let i = 0; i < removed.length; i += 1) {
      waterBodySet.delete(removed[i]);
      Composite.remove(engine.world, removed[i]);
    }
  }

  function trimWaterBodiesToLimit(incomingCount = 0) {
    const maxBodies = Math.max(1, Math.round(WATER.maxBodies));
    const overage = waterBodies.length + incomingCount - maxBodies;
    if (overage <= 0) {
      return;
    }

    const batchSize = Math.max(1, Math.round(WATER.cullBatchSize));
    removeWaterBodies(
      0,
      Math.min(waterBodies.length, Math.max(overage, batchSize)),
    );
  }

  function spawnDrop(sourceX, sourceY) {
    trimWaterBodiesToLimit(1);

    const radiusMin = Math.min(WATER.dropRadiusMin, WATER.dropRadiusMax);
    const radiusMax = Math.max(WATER.dropRadiusMin, WATER.dropRadiusMax);
    const radius =
      radiusMin + Math.random() * Math.max(radiusMax - radiusMin, 0.0001);
    const particleSides = Math.max(
      5,
      Math.min(10, Math.round(WATER.particleSides)),
    );
    const body = Bodies.polygon(
      sourceX + (Math.random() - 0.5) * WATER.spawnSpreadX,
      sourceY + WATER.spawnOffsetY + (Math.random() - 0.5) * WATER.spawnSpreadY,
      particleSides,
      radius,
      {
        restitution: WATER.restitution,
        friction: WATER.friction,
        frictionStatic: WATER.frictionStatic,
        frictionAir: WATER.frictionAir,
        density: WATER.density,
        slop: WATER.slop,
        render: {},
      },
    );
    body.circleRadius = radius;
    body.scoreState = {
      touchedCup: false,
      touchedEnvironment: false,
      splashes: 0,
    };

    applyParticleRenderState(body);

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * WATER.velocityXRange,
      y: Math.random() * WATER.velocityYMax,
    });

    waterBodies.push(body);
    waterBodySet.add(body);
    Composite.add(engine.world, body);
  }

  function updateHudStats(now = performance.now()) {
    if (!stats || now - lastHudUpdate < 120) {
      return;
    }

    lastHudUpdate = now;
    const fpsValue = smoothedFps > 0 ? Math.round(smoothedFps) : "--";
    stats.textContent = `score: ${score} | drops: ${waterBodies.length} | fps: ${fpsValue}`;
  }

  function startPour(evt) {
    evt.preventDefault();

    if (activePointerId !== null) {
      return;
    }

    const pointerWorldPoint = worldPointFromEvent(evt);
    const selectedPlatform = findDraggablePlatformAtPoint(pointerWorldPoint);
    if (selectedPlatform) {
      setActiveDraggablePlatform(selectedPlatform);
      isDraggingPlatform = true;
      isPouring = false;
      activePointerId = evt.pointerId;
      dragOffset = {
        x: pointerWorldPoint.x - selectedPlatform.position.x,
        y: pointerWorldPoint.y - selectedPlatform.position.y,
      };
      dragTarget = clampedDraggablePlatformPosition(
        pointerWorldPoint,
        selectedPlatform,
      );
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
    dragTarget = null;
    settleDraggablePlatform();

    if (canvas.hasPointerCapture(evt.pointerId)) {
      canvas.releasePointerCapture(evt.pointerId);
    }
  }

  function updateTiltInput(evt, isPressed) {
    const key = evt.key;
    const isTilt = key === "q" || key === "Q" || key === "e" || key === "E";
    const isMove =
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "a" ||
      key === "A" ||
      key === "d" ||
      key === "D" ||
      key === "w" ||
      key === "W" ||
      key === "s" ||
      key === "S";

    if (!isTilt && !isMove) {
      return;
    }

    evt.preventDefault();

    if (isTilt) {
      if (key === "q" || key === "Q") {
        tiltKeys.left = isPressed;
      } else {
        tiltKeys.right = isPressed;
      }
      tiltInput = (tiltKeys.right ? 1 : 0) - (tiltKeys.left ? 1 : 0);
      if (tiltInput === 0) {
        settleDraggablePlatform();
      }
    }

    if (isMove) {
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        moveKeys.left = isPressed;
      }
      if (key === "ArrowRight" || key === "d" || key === "D") {
        moveKeys.right = isPressed;
      }
      if (key === "ArrowUp" || key === "w" || key === "W") {
        moveKeys.up = isPressed;
      }
      if (key === "ArrowDown" || key === "s" || key === "S") {
        moveKeys.down = isPressed;
      }
    }
  }

  let prevTime = performance.now();

  function tick(now) {
    const rawDt = Math.max(now - prevTime, 0.0001);
    const dt = Math.min(rawDt, 34);
    prevTime = now;

    const instantFps = 1000 / rawDt;
    smoothedFps =
      smoothedFps === 0 ? instantFps : smoothedFps * 0.9 + instantFps * 0.1;

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

  function applyParticleRepulsion() {
    const strength = WATER.repulsionStrength;
    const radiusMul = WATER.repulsionRadius;
    if (strength <= 0 || radiusMul <= 0 || waterBodies.length < 2) {
      return;
    }

    const count = waterBodies.length;
    const gridSize = Math.max(10, WATER.repulsionGridSize);
    const grid = new Map();

    for (let i = 0; i < count; i += 1) {
      const b = waterBodies[i];
      const cx = (b.position.x / gridSize) | 0;
      const cy = (b.position.y / gridSize) | 0;
      const key = cx + cy * 100000;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(b);
    }

    grid.forEach((cell, key) => {
      const cy = (key / 100000) | 0;
      const cx = key - cy * 100000;
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const nKey = cx + dx + (cy + dy) * 100000;
          const neighbor = grid.get(nKey);
          if (!neighbor) {
            continue;
          }
          const isSelf = dx === 0 && dy === 0;
          for (let i = 0; i < cell.length; i += 1) {
            const a = cell[i];
            const jStart = isSelf ? i + 1 : 0;
            for (let j = jStart; j < neighbor.length; j += 1) {
              const b = neighbor[j];
              const ex = a.position.x - b.position.x;
              const ey = a.position.y - b.position.y;
              const dist2 = ex * ex + ey * ey;
              const rA = a.circleRadius || 5;
              const rB = b.circleRadius || 5;
              const threshold = (rA + rB) * radiusMul;
              const threshold2 = threshold * threshold;
              if (dist2 >= threshold2 || dist2 < 0.01) {
                continue;
              }
              const dist = Math.sqrt(dist2);
              const overlap = 1 - dist / threshold;
              const force = strength * overlap;
              const nx = ex / dist;
              const ny = ey / dist;
              Body.applyForce(a, a.position, { x: nx * force, y: ny * force });
              Body.applyForce(b, b.position, {
                x: -nx * force,
                y: -ny * force,
              });
            }
          }
        }
      }
    });
  }

  // Move the draggable cup during physics updates so particles collide with its path.
  Events.on(engine, "beforeUpdate", (event) => {
    stepDraggablePlatform();
    stepDraggablePlatformTilt(event.delta);
    stepDraggablePlatformMove(event.delta);
    applyParticleRepulsion();
  });

  Events.on(engine, "collisionStart", (event) => {
    const pairs = event.pairs;
    for (let i = 0; i < pairs.length; i += 1) {
      queueBlackHoleDeletion(pairs[i].bodyA, pairs[i].bodyB);
      scoreCollisionPair(pairs[i].bodyA, pairs[i].bodyB);
    }
  });

  // Dampen particles inside the active (held) cup so they settle quickly.
  function dampenCupParticles() {
    const cup = activeDraggablePlatform;
    if (!cup || WATER.cupDamping >= 1) {
      return;
    }

    const bounds = cup.bounds;
    const minX = bounds.min.x;
    const maxX = bounds.max.x;
    const minY = bounds.min.y;
    const maxY = bounds.max.y;
    const d = WATER.cupDamping;

    for (let i = 0; i < waterBodies.length; i += 1) {
      const body = waterBodies[i];
      const px = body.position.x;
      const py = body.position.y;
      if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
        Body.setVelocity(body, {
          x: body.velocity.x * d,
          y: body.velocity.y * d,
        });
      }
    }
  }

  // Remove particles that drift too far below/above the playable area.
  Events.on(engine, "afterUpdate", () => {
    removeQueuedBlackHoleParticles();
    dampenCupParticles();

    const width = render.options.width;
    const height = render.options.height;

    for (let i = waterBodies.length - 1; i >= 0; i -= 1) {
      const body = waterBodies[i];
      const { x, y } = body.position;
      if (x < -160 || x > width + 160 || y > height + 320 || y < -320) {
        waterBodySet.delete(body);
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
  window.addEventListener("keydown", (evt) => updateTiltInput(evt, true));
  window.addEventListener("keyup", (evt) => updateTiltInput(evt, false));
  window.addEventListener("resize", resize);

  resizeFluidBuffers();
  syncViewMode();
  buildControlsPanel();
  buildCupDrawer();
  spawnedCupStates.push(drainPlugState());
  buildWorld();
  requestAnimationFrame(tick);
})();
