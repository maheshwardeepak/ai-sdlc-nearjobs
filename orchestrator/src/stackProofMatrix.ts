export type StackProofMatrix = {
  backend: Array<{
    framework: string;
    proven: boolean;
  }>;
  frontend: Array<{
    framework: string;
    proven: boolean;
  }>;
  database: Array<{
    engine: string;
    proven: boolean;
  }>;
};

export function loadStackProofMatrix(): StackProofMatrix {
  return {
    backend: [
      { framework: "Spring Boot", proven: true },
      { framework: "NestJS", proven: false },
      { framework: "FastAPI", proven: false },
      { framework: "Gin", proven: false },
      { framework: "ASP.NET Core", proven: false }
    ],
    frontend: [
      { framework: "React", proven: true },
      { framework: "Next.js", proven: false },
      { framework: "Vue", proven: false },
      { framework: "Angular", proven: false }
    ],
    database: [
      { engine: "PostgreSQL", proven: true },
      { engine: "MySQL", proven: false },
      { engine: "MongoDB", proven: false },
      { engine: "SQLite", proven: false }
    ]
  };
}
