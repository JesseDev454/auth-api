import request from 'supertest';

import { createApp } from '../../src/app';

export const createTestClient = () => {
  return request(createApp());
};
