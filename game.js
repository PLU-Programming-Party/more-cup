(() => {
  const {
    Engine,
    Render,
    Runner,
    Bodies,
    Body,
    Composite,
    Events,
  } = Matter;

  const canvas = document.getElementById("world");
  const stats = document.getElementById("stats");

  const engine = Engine.create({
    gravity: { x: 0, y: 1.1 },
  });

  engine.positionIterations = 8;
  engine.velocityIterations = 6;

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

  const WORLD = {
    wallThickness: 120,
    floorHeight: 90,
    platformThickness: 24,
  };

  let boundaries = [];
  let platform = null;

  const waterBodies = [];
  const MAX_WATER_BODIES = 1200;
  const EMISSION_RATE = 170;

  let activePointerId = null;
  let isPouring = false;
  let pourPoint = { x: window.innerWidth / 2, y: 80 };
  let emitAccumulator = 0;
  let totalDrops = 0;

  function removeWorldBodies() {
    boundaries.forEach((body) => Composite.remove(engine.world, body));
    boundaries = [];

    if (platform) {
      Composite.remove(engine.world, platform);
      platform = null;
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
        render: { fillStyle: "#5f7f93" },
      }
    );

    const leftWall = Bodies.rectangle(-wt / 2, height / 2, wt, height * 2, {
      isStatic: true,
      render: { fillStyle: "#355265" },
    });

    const rightWall = Bodies.rectangle(width + wt / 2, height / 2, wt, height * 2, {
      isStatic: true,
      render: { fillStyle: "#355265" },
    });

    const platformY = height * (2 / 3);
    const platformWidth = Math.max(180, Math.min(width * 0.62, 500));

    platform = Bodies.rectangle(width / 2, platformY, platformWidth, WORLD.platformThickness, {
      isStatic: true,
      friction: 0.35,
      restitution: 0.05,
      chamfer: { radius: 10 },
      render: {
        fillStyle: "#e0bc7a",
        strokeStyle: "#f6dbab",
        lineWidth: 2,
      },
    });

    boundaries = [floor, leftWall, rightWall];
    Composite.add(engine.world, [...boundaries, platform]);
  }

  function worldPointFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * render.options.width;
    const y = ((evt.clientY - rect.top) / rect.height) * render.options.height;
    return { x, y };
  }

  function spawnDrop(sourceX, sourceY) {
    if (waterBodies.length >= MAX_WATER_BODIES) {
      const removed = waterBodies.shift();
      if (removed) {
        Composite.remove(engine.world, removed);
      }
    }

    const radius = 4 + Math.random() * 2.7;
    const body = Bodies.circle(
      sourceX + (Math.random() - 0.5) * 7,
      sourceY - 10 + (Math.random() - 0.5) * 4,
      radius,
      {
        restitution: 0.03,
        friction: 0.01,
        frictionStatic: 0,
        frictionAir: 0.004,
        density: 0.0012,
        slop: 0.01,
        render: {
          fillStyle: "#51c8ff",
          strokeStyle: "#a9ebff",
          lineWidth: 1,
        },
      }
    );

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 0.6,
      y: Math.random() * 0.2,
    });

    waterBodies.push(body);
    Composite.add(engine.world, body);

    totalDrops += 1;
    if (stats) {
      stats.textContent = `drops: ${totalDrops}`;
    }
  }

  function startPour(evt) {
    evt.preventDefault();

    if (activePointerId !== null) {
      return;
    }

    activePointerId = evt.pointerId;
    isPouring = true;
    pourPoint = worldPointFromEvent(evt);
    canvas.setPointerCapture(evt.pointerId);
  }

  function movePour(evt) {
    if (!isPouring || evt.pointerId !== activePointerId) {
      return;
    }

    evt.preventDefault();
    pourPoint = worldPointFromEvent(evt);
  }

  function stopPour(evt) {
    if (evt.pointerId !== activePointerId) {
      return;
    }

    isPouring = false;
    activePointerId = null;
  }

  let prevTime = performance.now();

  function tick(now) {
    const dt = Math.min(now - prevTime, 34);
    prevTime = now;

    if (isPouring) {
      emitAccumulator += (dt / 1000) * EMISSION_RATE;
      while (emitAccumulator >= 1) {
        spawnDrop(pourPoint.x, pourPoint.y);
        emitAccumulator -= 1;
      }
    }

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
    buildWorld();
  }

  canvas.addEventListener("pointerdown", startPour, { passive: false });
  canvas.addEventListener("pointermove", movePour, { passive: false });
  canvas.addEventListener("pointerup", stopPour);
  canvas.addEventListener("pointercancel", stopPour);
  window.addEventListener("resize", resize);

  buildWorld();
  requestAnimationFrame(tick);
})();
