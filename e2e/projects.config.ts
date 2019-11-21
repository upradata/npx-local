

export const projects = {
    project1: {
        projectI: 1,
        localDeps: [
            { projectI: 2, files: [ 'package.json', 'lib-esm' ] },
            { projectI: 3, files: [ 'package.json', 'README.md', 'lib', 'lib-esm' ] },
            { projectI: 4, files: [ 'package.json', 'lib' ] }
        ],
        usedBys: [ 4 ]
    },
    project2: {
        projectI: 2,
        usedBys: [ 1, 4 ]

    },
    project3: {
        projectI: 3,
        usedBys: [ 1, 4 ]
    },
    project4: {
        projectI: 4,
        localDeps: [
            { projectI: 1, files: [ 'package.json', 'lib' ] },
            { projectI: 2, files: [ 'package.json', 'lib-esm' ] },
            { projectI: 3, files: [ 'package.json', 'README.md', 'lib', 'lib-esm' ] },
        ],
        usedBys: [ 1 ]
    }
};
