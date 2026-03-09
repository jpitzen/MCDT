module.exports = {
  auth: require('./auth'),
  errorHandler: require('./errorHandler'),
  audit: require('./audit'),
  correlationId: require('./correlationId'),
  passwordStrength: require('./passwordStrength'),
  accountLockout: require('./accountLockout'),
};
