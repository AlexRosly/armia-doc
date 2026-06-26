module.exports = {
  apps: [
    {
      name: "armiadoc-backend",
      cwd: "/home/deploy/apps/backend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 7070,
      },
    },
  ],
};
