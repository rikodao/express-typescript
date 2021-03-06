import mysql, {QueryFunction} from 'mysql';
import dotenv from 'dotenv';
import util from 'util';
import IDBConnection from '~/application/adaper/infrastructure/IDBClient';
import {injectable} from 'inversify';
dotenv.config();

@injectable()
export default class MysqlClient implements IDBConnection {
  private pool: mysql.Pool;
  private query: (query: string, params?: string) => Promise<QueryFunction>;

  constructor() {
    this.pool = mysql.createPool({
      connectionLimit: 5,
      host: process.env.DB_HOST_DEV,
      user: process.env.DB_USER_DEV,
      password: process.env.DB_PASSWORD_DEV,
      database: process.env.DB_NAME_DEV,
      timezone: 'utc',
    });

    this.pool.getConnection((error: any, connection: any) => {
      if (error) {
        if (error.code === 'PROTOCOL_CONNECTION_LOST') {
          console.error('Database connection was closed.');
        }
        if (error.code === 'ER_CON_COUNT_ERROR') {
          console.error('Database has too many connections.');
        }
        if (error.code === 'ECONNREFUSED') {
          console.error('Database connection was refused.');
        }
      }

      if (connection) connection.release();

      return;
    });

    this.query = util.promisify(this.pool.query);

    // pool event
    this.pool.on('connection', (connection: any) => {
      console.log('mysql connection create');
    });

    this.pool.on('release', (connection: any) => {
      console.log('Connection %d released', connection.threadId);
    });
  }

  async execute(query: string, params?: any) {
    try {
      if (params) {
        return await this.query(query, params);
      }
      return await this.query(query);
    } catch (error) {
      this.pool.end();
      throw new Error(error);
    }
  }
}
