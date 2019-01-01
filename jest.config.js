const func = require('@jupyterlab/testutils/lib/jest-config');
const upstream = func('jupyterlab_go_to_definition', __dirname);

const reuseFromUpstream = [
    'moduleNameMapper',
    'setupTestFrameworkScriptFile',
    'setupFiles',
    'testPathIgnorePatterns',
    'moduleFileExtensions',
    'transform',
];

let local = {
  preset: 'ts-jest',
  globals: { 'ts-jest': { tsConfig: 'tsconfig.json' } }
};

for(option of reuseFromUpstream) {
    local[option] = upstream[option];
}

module.exports = local;
