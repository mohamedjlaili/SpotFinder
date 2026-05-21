'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/reset-password-direct',
      handler: 'space.resetPasswordDirect',
      config: {
        auth: false, // Accessible without JWT authorization header (public)
      },
    },
    {
      method: 'POST',
      path: '/auth/check-email',
      handler: 'space.checkEmailExists',
      config: {
        auth: false, // Publicly accessible to verify account presence
      },
    },
  ],
};
