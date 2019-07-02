const func = require('@jupyterlab/testutils/lib/jest-config');
const upstream = func('jupyterlab_go_to_definition', __dirname);

const reuseFromUpstream = [
    'preset',
    'moduleNameMapper',
    'setupFilesAfterEnv',
    'setupFiles',
    'testPathIgnorePatterns',
    'moduleFileExtensions',
];

let local = {
  globals: { 'ts-jest': { tsConfig: 'tsconfig.json' } },
  testRegex: `.*\.spec\.tsx?$`,
};

for(option of reuseFromUpstream) {
    local[option] = upstream[option];
}

module.exports = local;
