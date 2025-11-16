"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const INITIAL_SPEED = 120;
const MIN_SPEED = 60;

const DIRECTIONS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

const getRandomFood = (occupied: Point[]): Point => {
  const occupiedKey = new Set(occupied.map(({ x, y }) => `${x}-${y}`));
  let position: Point;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  } while (occupiedKey.has(`${position.x}-${position.y}`));
  return position;
};

const CanvasSnake = ({
  snake,
  food,
  isGameOver
}: {
  snake: Point[];
  food: Point;
  isGameOver: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0ea5e9");
    gradient.addColorStop(1, "#22d3ee");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const offset = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(canvas.width, offset);
      ctx.stroke();
    }

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;
      const radius = index === 0 ? 8 : 6;
      ctx.fillStyle = index === 0 ? "#f8fafc" : "rgba(241, 245, 249, 0.8)";
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, radius);
      ctx.fill();
    });

    if (isGameOver) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 28px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Juego terminado", canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = "18px 'Inter', system-ui, sans-serif";
      ctx.fillStyle = "rgba(241, 245, 249, 0.8)";
      ctx.fillText(
        "Presiona Reiniciar para intentarlo de nuevo",
        canvas.width / 2,
        canvas.height / 2 + 16
      );
    }
  }, [snake, food, isGameOver]);

  return (
    <canvas
      ref={canvasRef}
      width={GRID_SIZE * CELL_SIZE}
      height={GRID_SIZE * CELL_SIZE}
      className="game-canvas"
      aria-hidden
    />
  );
};

export default function Home() {
  const [snake, setSnake] = useState<Point[]>([]);
  const [direction, setDirection] = useState<Point>(DIRECTIONS.ArrowRight);
  const [queuedDirection, setQueuedDirection] = useState<Point | null>(null);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.localStorage.getItem("best-score");
    return saved ? Number(saved) : 0;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const directionRef = useRef(direction);
  const queuedRef = useRef<Point | null>(queuedDirection);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    queuedRef.current = queuedDirection;
  }, [queuedDirection]);

  const resetGame = useCallback(() => {
    const initialSnake: Point[] = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 }
    ];
    setSnake(initialSnake);
    setDirection(DIRECTIONS.ArrowRight);
    setQueuedDirection(null);
    setFood(getRandomFood(initialSnake));
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsRunning(false);
    setIsGameOver(false);
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const updateDirection = useCallback((next: Point) => {
    const { x, y } = directionRef.current;
    if (x + next.x === 0 && y + next.y === 0) return;
    setDirection(next);
    setQueuedDirection(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const next = DIRECTIONS[event.key];
      if (!next) return;
      if (!isRunning) {
        setIsRunning(true);
      }
      if (queuedRef.current) {
        const { x, y } = directionRef.current;
        if (x + next.x === 0 && y + next.y === 0) return;
        setQueuedDirection(next);
        return;
      }
      updateDirection(next);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, updateDirection]);

  useEffect(() => {
    if (!isRunning || isGameOver) return;

    const interval = window.setInterval(() => {
      setSnake(prevSnake => {
        const currentDirection = queuedRef.current ?? directionRef.current;
        if (queuedRef.current) {
          updateDirection(queuedRef.current);
        }

        const head = prevSnake[0];
        const newHead = {
          x: head.x + currentDirection.x,
          y: head.y + currentDirection.y
        };

        const hitWall =
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE;

        const hitSelf = prevSnake.some(
          segment => segment.x === newHead.x && segment.y === newHead.y
        );

        if (hitWall || hitSelf) {
          setIsGameOver(true);
          setIsRunning(false);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        if (newHead.x === food.x && newHead.y === food.y) {
          const newScore = score + 10;
          setScore(newScore);
          setFood(getRandomFood(newSnake));
          setSpeed(prev => Math.max(MIN_SPEED, prev - 4));
          setBestScore(prevBest => {
            const latestBest = Math.max(prevBest, newScore);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                "best-score",
                latestBest.toString()
              );
            }
            return latestBest;
          });
          return newSnake;
        }

        newSnake.pop();
        return newSnake;
      });
    }, speed);

    return () => window.clearInterval(interval);
  }, [food, isGameOver, isRunning, score, speed, updateDirection]);

  const startOrPause = useCallback(() => {
    if (isGameOver) {
      resetGame();
      setIsRunning(true);
      return;
    }
    setIsRunning(prev => !prev);
  }, [isGameOver, resetGame]);

  const speedDisplay = useMemo(() => {
    const difficulty =
      speed <= 70 ? "🔥 Muy rápido" : speed <= 90 ? "⚡ Rápido" : "🌿 Suave";
    return `${difficulty} (${speed}ms)`;
  }, [speed]);

  const handleDirectionButton = (directionKey: keyof typeof DIRECTIONS) => {
    const next = DIRECTIONS[directionKey];
    if (!isRunning) {
      setIsRunning(true);
    }
    if (queuedRef.current) {
      const { x, y } = directionRef.current;
      if (x + next.x === 0 && y + next.y === 0) return;
      setQueuedDirection(next);
      return;
    }
    updateDirection(next);
  };

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>Snake Neo</h1>
          <p className="subtitle">
            Aumenta tu racha, esquiva tus propios movimientos y domina la
            serpiente.
          </p>
        </div>
        <div className="scoreboard" role="status">
          <div>
            <span className="label">Puntaje</span>
            <span className="value">{score}</span>
          </div>
          <div>
            <span className="label">Mejor</span>
            <span className="value">{bestScore}</span>
          </div>
          <div>
            <span className="label">Velocidad</span>
            <span className="value">{speedDisplay}</span>
          </div>
        </div>
      </header>

      <section className="arena">
        <CanvasSnake snake={snake} food={food} isGameOver={isGameOver} />

        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={startOrPause}
            aria-label={isRunning ? "Pausar juego" : "Iniciar juego"}
          >
            {isGameOver ? "Reiniciar" : isRunning ? "Pausar" : "Jugar"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={resetGame}
            disabled={!isRunning && !isGameOver && score === 0}
          >
            Reiniciar
          </button>
        </div>
      </section>

      <section className="controls">
        <span className="label control-title">Controles táctiles</span>
        <div className="dpad" aria-hidden>
          <button
            type="button"
            className="pad pad-up"
            onClick={() => handleDirectionButton("ArrowUp")}
          >
            ↑
          </button>
          <button
            type="button"
            className="pad pad-left"
            onClick={() => handleDirectionButton("ArrowLeft")}
          >
            ←
          </button>
          <button
            type="button"
            className="pad pad-right"
            onClick={() => handleDirectionButton("ArrowRight")}
          >
            →
          </button>
          <button
            type="button"
            className="pad pad-down"
            onClick={() => handleDirectionButton("ArrowDown")}
          >
            ↓
          </button>
        </div>
        <p className="hint">
          Usa las flechas del teclado o los controles táctiles para guiar a la
          serpiente. ¡Come la fruta y evita chocar contigo mismo!
        </p>
      </section>
    </main>
  );
}
