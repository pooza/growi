const ConfigLoader = require('../service/config-loader')
  , debug = require('debug')('growi:service:ConfigManager');

class ConfigManager {

  constructor(configModel) {
    this.configModel = configModel;
    this.configLoader = new ConfigLoader(this.configModel);
    this.configObject = null;
  }

  /**
   * load configs from the database and the environment variables
   */
  async loadConfigs() {
    this.configObject = await this.configLoader.load();

    debug('ConfigManager#loadConfigs', this.configObject);
  }

  /**
   * get a config specified by namespace & key
   *
   * Basically, search a specified config from configs loaded from the database at first
   * and then from configs loaded from the environment variables.
   *
   * In some case, this search method changes.
   *
   * the followings are the meanings of each special return value.
   * - null:      a specified config is not set.
   * - undefined: a specified config does not exist.
   */
  getConfig(namespace, key) {
    if (this.searchOnlyFromEnvVarConfigs('crowi', 'security:passport-saml:useOnlyEnvVarsForSomeOptions')) {
      // TODO create a method to delegate this process
      return this.searchOnlyFromEnvVarConfigs(namespace, key);
    }

    return this.defaultSearch(namespace, key);
  }

  /**
   * get a config specified by namespace & key from configs loaded from the database
   *
   * **Do not use this unless absolutely necessary. Use getConfig instead.**
   */
  getConfigFromDB(namespace, key) {
    return this.searchOnlyFromDBConfigs(namespace, key);
  }

  /**
   * get a config specified by namespace & key from configs loaded from the environment variables
   *
   * **Do not use this unless absolutely necessary. Use getConfig instead.**
   */
  getConfigFromEnvVars(namespace, key) {
    return this.searchOnlyFromEnvVarConfigs(namespace, key);
  }

  /**
   * update configs by a iterable object consisting of several objects with ns, key, value fields
   *
   * For example:
   * ```
   *  updateConfigs(
   *   [{
   *     ns:    'some namespace 1',
   *     key:   'some key 1',
   *     value: 'some value 1'
   *   }, {
   *     ns:    'some namespace 2',
   *     key:   'some key 2',
   *     value: 'some value 2'
   *   }]
   *  );
   * ```
   */
  async updateConfigs(configs) {
    const results = [];
    for (const config of configs) {
      results.push(
        this.configModel.findOneAndUpdate(
          { ns: config.ns, key: config.key },
          { ns: config.ns, key: config.key, value: JSON.stringify(config.value) },
          { upsert: true, }
        ).exec()
      );
    }
    await Promise.all(results);

    await this.loadConfigs();
  }

  /**
   * private api
   *
   * Search a specified config from configs loaded from the database at first
   * and then from configs loaded from the environment variables.
   */
  defaultSearch(namespace, key) {
    if (!this.configExistsInDB(namespace, key) && !this.configExistsInEnvVars(namespace, key)) {
      return undefined;
    }

    if (this.configExistsInDB(namespace, key) && !this.configExistsInEnvVars(namespace, key) ) {
      return this.configObject.fromDB[namespace][key];
    }

    if (!this.configExistsInDB(namespace, key) && this.configExistsInEnvVars(namespace, key) ) {
      return this.configObject.fromEnvVars[namespace][key];
    }

    if (this.configExistsInDB(namespace, key) && this.configExistsInEnvVars(namespace, key) ) {
      if (this.configObject.fromDB[namespace][key] !== null) {
        return this.configObject.fromDB[namespace][key];
      }
      else {
        return this.configObject.fromEnvVars[namespace][key];
      }
    }
  }

  /**
   * private api
   *
   * Search a specified config from configs loaded from the database
   */
  searchOnlyFromDBConfigs(namespace, key) {
    if (!this.configExistsInDB(namespace, key)) {
      return undefined;
    }

    return this.configObject.fromEnvVars[namespace][key];
  }

  /**
   * private api
   *
   * Search a specified config from configs loaded from the environment variables
   */
  searchOnlyFromEnvVarConfigs(namespace, key) {
    if (!this.configExistsInEnvVars(namespace, key)) {
      return undefined;
    }

    return this.configObject.fromEnvVars[namespace][key];
  }

  /**
   * private api
   *
   * check whether a specified config exists in configs loaded from the database
   * @returns {boolean}
   */
  configExistsInDB(namespace, key) {
    if (this.configObject.fromDB[namespace] === undefined) {
      return false;
    }

    return this.configObject.fromDB[namespace][key] !== undefined;
  }

  /**
   * private api
   *
   * check whether a specified config exists in configs loaded from the environment variables
   * @returns {boolean}
   */
  configExistsInEnvVars(namespace, key) {
    if (this.configObject.fromEnvVars[namespace] === undefined) {
      return false;
    }

    return this.configObject.fromEnvVars[namespace][key] !== undefined;
  }
}

module.exports = ConfigManager;
