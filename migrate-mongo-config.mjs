// migrate-mongo-config.cjs
module.exports = {
  mongodb: {
    url: 'mongodb://localhost:27017',
    databaseName: 'qrshop',
    options: {
      useNewUrlParser: true, // removes a deprecation warning when connecting
      useUnifiedTopology: true, // removes a deprecation warning when connecting
      // connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      // socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    },
  },

  migrationsDir: 'migrations', // The migrations directory, can be a relative or absolute path
  changelogCollectionName: 'changelog', // The collection where the applied changes are stored
  migrationFileExtension: '.js', // The file extension to create migrations and search for in migration dir
  useFileHash: false, // Enable the algorithm to create a checksum of the file contents (default is false)
  moduleSystem: 'commonjs', // Module system to use for migrations
};
