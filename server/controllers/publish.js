const authorize = require('../lib/authorize');

const path = require('path');
const views = require('co-views');
const child_process = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const render = views(path.join(__dirname, '../views'), { ext: 'ejs' });
const upload = require('../lib/publish');

const webshot = require('webshot');

module.exports = class {
  static url = '/publish/:id';

  @authorize([ 'EDIT' ])
  static async get(ctx) {
    let { id } = ctx.params;
    let result = await ctx.sql('                                                              \
      SELECT `id`, `title`, `config`, `items`, `create_by`, `create_at`              \
        FROM `pages` WHERE `id` = ? AND `is_delete` = 0                                       \
    ', [ id ]);
    let page = result[0];
    if (!page) throw { status: 404, name: 'PAGES_NOT_FOUND', message: 'page is not found' };
    try { page.items = JSON.parse(page.items); } catch(error) {
      throw { status: 500, name: 'JSON_PARSE_ERROR', message: 'json parse error' }
    };

    let html = await render('activity', { page: page });

    ctx.body = html
  }

  @authorize([ 'EDIT' ])
  static async put(ctx) {
    let { id } = ctx.params;
    let [page] = await ctx.sql('                                                              \
      SELECT `id`, `title`, `config`, `items`, `create_by`, `create_at`              \
        FROM `pages` WHERE `id` = ? AND `is_delete` = 0                                       \
    ', [ id ]);
    if (!page) throw { status: 404, name: 'PAGES_NOT_FOUND', message: 'page is not found' };

    const dir = `public/${id}`;

    if (!fs.existsSync(dir)) {

      mkdirp(dir, function (err) {
        if (err) {
          console.error(err)
        }
      });
    }

    try {
      page.config = JSON.parse(page.config);
      page.items = JSON.parse(page.items);
    } catch(error) {
      throw { status: 500, name: 'JSON_PARSE_ERROR', message: 'json parse error' }
    };

    let html = await render('activity', { page: page });

    await fs.writeFileSync(dir + `/index.html`, html, 'utf-8', {'flags': 'w+'});

    const command = `NODE_ENV=production webpack --config ./build/webpack.publish.js --env.id=${id} --hide-modules --json`;

    const stdout = child_process.execSync(command);

    let packRes = JSON.parse(stdout);

    if (packRes.errors.length == 0) {
      let files = packRes.assets.map(item => {
        return fs.createReadStream(dir + `/${item.name}`)
      })
      let uploadRes = await upload(files);

      var options = {
        screenSize: {
          width: 375
        , height: 375
        }
      , shotSize: {
          width: 375
        , height: 'all'
        }
      , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
          + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
      };

      webshot(uploadRes[0].url, `${dir}/cover.png`, options, function(err) {
        if(err) {
          throw { status: 404, name: 'WEBSHOT_ERR', message: 'webshot failed' };
        }
      });

      ctx.body = uploadRes
    } else {

      ctx.body = packRes;
    }

  }

}
