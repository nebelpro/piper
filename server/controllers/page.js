const authorize = require('../lib/authorize');
const __ = require('../constants');

module.exports = class {
  static url = '/page/:id';

  @authorize([ 'CHANGE' ])
  static async delete(ctx) {
    let { id } = ctx.params;
    await ctx.sql.commit('UPDATE `pages` SET `is_delete` = 1 WHERE `id` = ?', [ id ]);
    await ctx.sql(
      'INSERT INTO `changelog` (`action`, `page_id`, `items`, `create_by`) VALUES (?)',
      [ [ 3, id, '', ctx.user.id ] ]
    );
    ctx.body = {
      message: 'Delete success'
    };
  }

  @authorize([ 'EDIT' ])
  static async get(ctx) {
    let { id } = ctx.params;
    let result = await ctx.sql('                                                               \
      SELECT `id`, `title`, `config`, `items`, `create_by`, `create_at`               \
        FROM `pages` WHERE `id` = ? AND `is_delete` = 0                                        \
    ', [ id ]);
    let page = result[0];
    if (!page) throw { status: 404, name: 'PAGES_NOT_FOUND', message: 'page is not found' };
    try {
      if(page.items) page.items = JSON.parse(page.items);
      if(page.config) page.config = JSON.parse(page.config);
    } catch(error) {
      throw { status: 500, name: 'JSON_PARSE_ERROR', message: 'json parse error' }
    };
    ctx.body = page;
  }

  @authorize([ 'EDIT' ])
  static async put(ctx) {
    let { id } = ctx.params;
    let { body } = ctx.request;
    let change = Object.create(null);
    let count = [ 'title', 'config', 'items' ].reduce((count, name) => {
      if (!(name in body)) return count;
      change[name] = body[name];
      return count + 1;
    }, 0);
    if (count === 0) throw { status: 400, name: 'ERR', message: 'require `title` or/and `items` in request body' };
    change.title = change.title.trim();
    if (!change.title) throw { status: 400, name: 'ERROR_PARAMS', message: 'Title 不能为空' };
    if ('items' in change) {
      change.items = JSON.stringify(change.items);
      if (change.items.length > __.VALUE_MAX_LENGTH) throw __.VALUE_TOO_LONG;
    }
    if ('config' in change) {
      change.config = JSON.stringify(change.config);
    }
    await ctx.sql.commit(async () => {
      let [ page ] = await ctx.sql('SELECT `is_delete`, `items` FROM `pages` WHERE `id` = ?', [ id ]);
      if (!page || page.is_delete) throw { status: 404, name: 'PAGE_NOT_FOUND', message: 'page is not found' };
      await ctx.sql('UPDATE `pages` SET ? WHERE `id` = ?', [ change, id ]);
      let changed = [ 'title', 'config', 'items' ].reduce((changed, name) => {
        return (page[name] !== change[name]) ? changed + 1 : changed;
      }, 0);
      if (changed > 0) {
        await ctx.sql(
          'INSERT INTO `changelog` (`action`, `page_id`, `items`, `create_by`) VALUES (?)',
          [ [ 2, id, change.items, ctx.user.id ] ]
        );
      }
    });
    ctx.body = {
      message: 'Save success'
    };
  }

};
