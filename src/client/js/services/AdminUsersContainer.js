import { Container } from 'unstated';

import loggerFactory from '@alias/logger';

// eslint-disable-next-line no-unused-vars
const logger = loggerFactory('growi:services:UserGroupDetailContainer');

/**
 * Service container for admin users page (Users.jsx)
 * @extends {Container} unstated Container
 */
export default class AdminUsersContainer extends Container {

  constructor(appContainer) {
    super();

    this.appContainer = appContainer;

    this.state = {
      users: [],
      isPasswordResetModalShown: false,
      isUserInviteModalShown: false,
      userForPasswordResetModal: null,
      totalUsers: 0,
      activePage: 1,
      pagingLimit: Infinity,
    };

    this.showPasswordResetModal = this.showPasswordResetModal.bind(this);
    this.hidePasswordResetModal = this.hidePasswordResetModal.bind(this);
    this.toggleUserInviteModal = this.toggleUserInviteModal.bind(this);
  }

  /**
   * Workaround for the mangling in production build to break constructor.name
   */
  static getClassName() {
    return 'AdminUsersContainer';
  }

  /**
   * syncUsers of selectedPage
   * @memberOf AdminUsersContainer
   * @param {number} selectedPage
   */
  async retrieveUsersByPagingNum(selectedPage) {

    const params = { page: selectedPage };
    const { data } = await this.appContainer.apiv3.get('/users', params);

    if (data.paginateResult == null) {
      throw new Error('data must conclude \'paginateResult\' property.');
    }

    const { docs: users, totalDocs: totalUsers, limit: pagingLimit } = data.paginateResult;

    this.setState({
      users,
      totalUsers,
      pagingLimit,
      activePage: selectedPage,
    });

  }

  /**
   * create user invited
   * @memberOf AdminUsersContainer
   * @param {object} shapedEmailList
   * @param {bool} sendEmail
   */
  async createUserInvited(shapedEmailList, sendEmail) {
    const response = await this.appContainer.apiv3.post('/users/invite', {
      shapedEmailList,
      sendEmail,
    });
    const { emailList } = response.data;
    return emailList;
  }

  /**
   * open reset password modal, and props user
   * @memberOf AdminUsersContainer
   * @param {object} user
   */
  async showPasswordResetModal(user) {
    await this.setState({
      isPasswordResetModalShown: true,
      userForPasswordResetModal: user,
    });
  }

  /**
   * close reset password modal
   * @memberOf AdminUsersContainer
   */
  async hidePasswordResetModal() {
    await this.setState({ isPasswordResetModalShown: false });
  }

  /**
   * toggle user invite modal
   * @memberOf AdminUsersContainer
   */
  async toggleUserInviteModal() {
    await this.setState({ isUserInviteModalShown: !this.state.isUserInviteModalShown });
  }

  /**
   * Give user admin
   * @memberOf AdminUsersContainer
   * @param {string} userId
   * @return {string} username
   */
  async giveUserAdmin(userId) {
    const response = await this.appContainer.apiv3.put(`/users/${userId}/giveAdmin`);
    const { username } = response.data.userData;
    return username;
  }

  /**
   * Remove user admin
   * @memberOf AdminUsersContainer
   * @param {string} userId
   * @return {string} username
   */
  async removeUserAdmin(userId) {
    const response = await this.appContainer.apiv3.put(`/users/${userId}/removeAdmin`);
    const { username } = response.data.userData;
    return username;
  }

  /**
   * Activate user
   * @memberOf AdminUsersContainer
   * @param {string} userId
   * @return {string} username
   */
  async activateUser(userId) {
    const response = await this.appContainer.apiv3.put(`/users/${userId}/activate`);
    const { username } = response.data.userData;
    return username;
  }

  /**
   * Deactivate user
   * @memberOf AdminUsersContainer
   * @param {string} userId
   * @return {string} username
   */
  async deactivateUser(userId) {
    const response = await this.appContainer.apiv3.put(`/users/${userId}/deactivate`);
    const { username } = response.data.userData;
    return username;
  }

  /**
   * remove user
   * @memberOf AdminUsersContainer
   * @param {string} userId
   * @return {string} username
   */
  async removeUser(userId) {
    const response = await this.appContainer.apiv3.delete(`/users/${userId}/remove`);
    const { username } = response.data.userData;
    return username;
  }

}
