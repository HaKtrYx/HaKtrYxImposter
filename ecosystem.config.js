module.exports = {
  apps: [{
    name: "imposter-game-server",
    cwd: "./server",
    script: "npm",
    args: "start",
    env: {
      PORT: 3001,
      NODE_ENV: "production"
    }
  }, {
    name: "imposter-game-client",
    cwd: "./client",
    script: "npm",
    args: ["run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
    env: {
      NODE_ENV: "production"
    }
  }]
}
