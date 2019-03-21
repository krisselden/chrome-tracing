import { expect } from 'chai';
import 'mocha';
import {
  findMangledDefine,
  getModuleIndex,
  ParsedFile
} from '../../src/trace/metadata';

describe('getModuleIndex', () => {
  it('returns a module index if we detect a define ident', () => {
    const index = getModuleIndex(
      'const a=1;define("foo-bar",["exports"],function(exports) {',
      'define'
    );

    expect(index).to.not.equal(-1);
    expect(index).to.equal(8);
  });
  it('returns a module index if we detect a mangled define identifier', () => {
    const index = getModuleIndex(
      'const a=1;e("foo-bar",["exports"],function(exports) {',
      'e'
    );

    expect(index).to.not.equal(-1);
    expect(index).to.equal(8);
  });

  it('does not get confused with other calls', () => {
    const index = getModuleIndex(
      'const f=()=> e();e("foo-bar",["exports"],function(exports) {',
      'e'
    );

    expect(index).to.not.equal(-1);
    expect(index).to.equal(15);
  });

  it('returns EOF if nothing found', () => {
    const index = getModuleIndex('const f=()=> e();', 'e');

    expect(index).to.equal(-1);
  });
});

describe('findMangledDefine', () => {
  it('finds the internal loader ident index', () => {
    const content =
      'if (false) {woot=undefined;}else woot=n.__loader.define; b="b";';
    const ident = findMangledDefine(content);
    expect(ident).to.equal('woot');
  });
});

describe('ParsedFile', () => {
  it('can find module names', () => {
    const content = `
      const a = 'b';
      const d = 'd';
      define("foo-bar",["exports"],function(e) {
        const something = 'woot';
        function barbar() {
          return 'bar';
        }
        const other = 'bar';
      });
    `;
    const file = new ParsedFile(content);

    const moduleName = file.moduleNameFor({
      url: 'thing',
      columnNumber: 17,
      lineNumber: 5,
      scriptId: 1,
      functionName: 'barbar'
    });

    expect(moduleName).to.equal('foo-bar');
  });

  it('can find module name in mangled ident', () => {
    const content = `
      if (false) {woot=undefined;}else woot=n.__loader.define;
      const a = 'b';
      const d = 'd';
      woot("foo-bar",["exports"],function(e) {
        const something = 'woot';
        function barbar() {
          return 'bar';
        }
        const other = 'bar';
      });
    `;
    const file = new ParsedFile(content);

    const moduleName = file.moduleNameFor({
      url: 'thing',
      columnNumber: 17,
      lineNumber: 5,
      scriptId: 1,
      functionName: 'barbar'
    });

    expect(moduleName).to.equal('foo-bar');
  });

  it('gracefully handles unknown modules', () => {
    const content = `
      if (false) {woot=undefined;}else woot=n.__loader.define;
      const a = 'b';
      const d = 'd';
      function barbar() {
        return 'bar';
      }
    `;
    const file = new ParsedFile(content);

    const moduleName = file.moduleNameFor({
      url: 'thing',
      columnNumber: 14,
      lineNumber: 4,
      scriptId: 1,
      functionName: 'barbar'
    });

    expect(moduleName).to.equal('unknown');
  });
});
