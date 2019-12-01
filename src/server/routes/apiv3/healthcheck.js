const loggerFactory = require('@alias/logger');

const logger = loggerFactory('growi:routes:apiv3:healthcheck'); // eslint-disable-line no-unused-vars

const express = require('express');

const router = express.Router();

const helmet = require('helmet');

/**
 * @swagger
 *  tags:
 *    name: Healthcheck
 */

module.exports = (crowi) => {
  /**
   * @swagger
   *
   *  /healthcheck:
   *    get:
   *      tags: [Healthcheck]
   *      description: Check whether the server is healthy or not
   *      parameters:
   *        - name: connectToMiddlewares
   *          in: query
   *          description: Check also MongoDB and SearchService
   *          schema:
   *            type: boolean
   *      responses:
   *        200:
   *          description: Resources are available
   *          content:
   *            application/json:
   *              schema:
   *                properties:
   *                  mongo:
   *                    type: string
   *                    description: 'OK'
   *                  searchInfo:
   *                    type: object
   */
  router.get('/', helmet.noCache(), async(req, res) => {
    const connectToMiddlewares = req.query.connectToMiddlewares;

    // return 200 w/o connecting to MongoDB and SearchService
    if (connectToMiddlewares == null) {
      res.status(200).send({ status: 'OK' });
      return;
    }

    try {
      // connect to MongoDB
      const Config = crowi.models.Config;
      await Config.findOne({});
      // connect to Elasticsearch
      const search = crowi.getSearcher();
      const searchInfo = await search.getInfo();

      res.status(200).send({ mongo: 'OK', searchInfo });
    }
    catch (err) {
      res.status(503).send({ err });
    }
  });

  return router;
};
