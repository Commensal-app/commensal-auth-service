const common = require('commensal-common');
const Authenticator = require('./Authenticator');
const UserHandler = require('./UserHandler');
require('es6-promise').polyfill();
require('isomorphic-fetch');

module.exports = class AuthenticationHttpHandler {
  constructor(event) {
    this.event = event;
  }

  async get() {
    return new Promise(async (resolve, reject) => {
      try {
        const fbToken = this._validateHeaders();
        const authenticator = new Authenticator();
        const fbUser = await authenticator.getFBUser(fbToken);
        const serviceToken = await authenticator.generateToken(null, 'service');
        const userHandler = new UserHandler(serviceToken);
        const user = await userHandler.getUser(fbUser.id);

        if (user && user.data && user.data.Count > 0) {
          const userToken = await authenticator.generateToken(user.data.Items, 'user');
          const response = this._generateUserResponse(user, userToken);
          resolve(response);
        } else {
          const userNew = await userHandler.createUser(fbUser);
          if (userNew.data) {
            const userToken = await authenticator.generateToken(userNew.data.Items, 'user');
            const response = this._generateUserResponse(userNew, userToken);
            resolve(response);
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  _validateHeaders() {
    if (!this.event.headers || !this.event.headers.Authorization) {
      throw new common.errors.HttpError('Missing Authorization: Bearer token', 400);
    }
    const { Authorization: token } = this.event.headers;
    return token;
  }

  _generateUserResponse(user, token) {
    const response = {
      body: JSON.stringify({
        data: {
          id: user.data.Items[0].id,
          token,
          code: 200,
        },
      }),
    };
    return response;
  }
};