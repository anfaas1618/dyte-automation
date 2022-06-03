process.chdir(__dirname);
const exec = require('child_process').exec;
require("dotenv").config();
const octikit = require("@octokit/rest");

const csv = require('csv-parser');
const fs = require('fs');
let cmd = process.argv[2];
let folderName = process.argv[3];
let dependencyWithVersion = process.argv[4];
console.log(cmd);
console.log(folderName);
console.log(dependencyWithVersion);
var valuesDependencySplit = dependencyWithVersion.split('@');
dependecyToUpdate=valuesDependencySplit[0];
dependencyToUpdateVersion = valuesDependencySplit[1];


const fields = [];
let csvString;
const clientWithAuth = new octikit({
    auth: "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"
});

function versionCompare(v1, v2)
{
    var vnum1 = 0, vnum2 = 0;
    for (var i = 0, j = 0; (i < v1.length
        || j < v2.length);) {
        while (i < v1.length && v1[i] !== '.') {
            vnum1 = vnum1 * 10 + (v1[i] - '0');
            i++;
        }
        while (j < v2.length && v2[j] !== '.') {
            vnum2 = vnum2 * 10 + (v2[j] - '0');
            j++;
        }

        if (vnum1 > vnum2)
            return 1;
        if (vnum2 > vnum1)
            return -1;
        vnum1 = vnum2 = 0;
        i++;
        j++;
    }
    return 0;
}
fs.createReadStream(folderName)
    .pipe(csv())
    .on('data', (row) => {
        const githubRemoveRegex = /(?<=github.com)[^.\s]/g;
        const nameOwnerRegex= /(?<=\/).*?(?=\/)/;
        const cleanRepoNameRegex=/.*?(?=\/)/;
        const githubRemove = githubRemoveRegex.exec(row.repo);

        // console.log(myArray.index);
        let  githubRemoved;
        githubRemoved=row.repo.substring(githubRemove.index);
        const owner= nameOwnerRegex.exec(githubRemoved).toString();
        let m=githubRemoved.substring(owner.toString().length+2);
        let repoName=cleanRepoNameRegex.exec(m);
        if (repoName==null)
            repoName=m;
        else
            repoName=repoName.toString();
        console.log(repoName);
        console.log(owner);
        if(cmd=="update")
            console.log(UpdateReport(owner,repoName,dependecyToUpdate,dependencyToUpdateVersion,row.name,row.repo));
        else
            console.log(DefaultReport(owner,repoName,dependecyToUpdate,dependencyToUpdateVersion,row.name,row.repo));
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
    });
async function DefaultReport(owner,repo,dependency,version,name,repoLink) {
    let result =await  clientWithAuth.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: owner,
        repo: repo,
        path:"package.json",
    }).then(result => {
        // content will be base64 encoded
        const content = Buffer.from(result.data.content, 'base64').toString()
        let buff = new Buffer.from(result.data.content, 'base64');
        let text = buff.toString('ascii');
        let json = JSON.parse(text);
        let version_got = json['dependencies'][dependency].substring(1);
        const field = {};
        field.name=name;
        field.repo=repoLink;
        field.version=version_got;
        if (versionCompare(version_got,version)<0)
        {
            // console.log(`owner ${owner} with repo${repo} with version ${version_got} is lower then ${version}`);
            field.version_satisfied="false";
        }
        else
            field.version_satisfied="true";
        fields.unshift(field);
        csvString = [
            [
                "name",
                "repo",
                "version",
                "version_satisfied"
            ],
            ...fields.map(field => [
                field.name,
                field.repo,
                field.version,
                field.version_satisfied
            ])
        ];
        // console.log(csvString);
        fs.writeFile("./test.csv", csvString.join("\r\n"), (err) => {
            console.log(err || "done");
        });
    })
}
async function UpdateReport(owner,repo,dependency,version,name,repoLink) {
    let result =await  clientWithAuth.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: owner,
        repo: repo,
        path:"package.json",
    }).then(resultmain => {
        // content will be base64 encoded
        const content = Buffer.from(resultmain.data.content, 'base64').toString()
        let buff = new Buffer.from(resultmain.data.content, 'base64');
        let text = buff.toString('ascii');
        let json = JSON.parse(text);

        let version_got = json['dependencies'][dependency].substring(1);
        const field = {};
        field.name=name;
        field.repo=repoLink;
        field.version=version_got;
        if (versionCompare(version_got,version)<0)
        {
            // console.log(`owner ${owner} with repo${repo} with version ${version_got} is lower then ${version}`);
            field.version_satisfied="false";
            clientWithAuth.repos.createFork({
                owner:owner,
                repo:repo,


            }).then(async results => {
                json['dependencies'][dependency] = "^0.23.0";
                console.log(json);
                //     const string = JSON.stringify(json) // convert Object to a String
                let string = JSON.stringify(json, null, 2); // Indented with tab
                let encodedString = Buffer.from(string).toString('base64');



                const fs = require('fs');
                const dir = './tmp';
                var jsonContent = JSON.stringify(json);
                //    console.log(jsonContent);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
                fs.writeFile("./tmp/package.json", jsonContent, 'utf8', function (err) {
                    if (err) {
                        console.log("An error occured while writing JSON Object to File.");
                        return console.log(err);
                    }

                    console.log("JSON file has been saved.");
                });


                function os_func() {
                    this.execCommand = function(cmd, callback) {
                        exec(cmd, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`exec error: ${error}`);
                                return;
                            }

                            callback(stdout);
                        });
                    }
                }
                var os = new os_func();
                os.execCommand('./friday',  function (returnvalue) {
                    //   Here you can get the return value
                    let result =  clientWithAuth.request('GET /repos/{owner}/{repo}/contents/{path}', {
                        owner: "anfaas1618",
                        repo: repo,
                        path: "package-lock.json",
                    }).then(async result => {
                        // console.log(result)
                        let rawdata = fs.readFileSync('./tmp/package-lock.json');
                        let packageLock = JSON.parse(rawdata);
                        let string2 = JSON.stringify(packageLock, null, 2); // Indented with tab
                        let encodedString2 = Buffer.from(string2).toString('base64');
                        // const encodedString2 = btoa(string2) // Base64 encode the String
                        clientWithAuth.repos.createOrUpdateFile({
                            owner: "anfaas1618",
                            repo: repo,
                            path: "package-lock.json",
                            content: encodedString2,
                            message: `update package-lock.json ${"axios"} from ${version_got} to ${version} `,
                            sha: result.data.sha
                        });
                        let as = await clientWithAuth.request('GET /repos/{owner}/{repo}/contents/{path}', {
                            owner: "anfaas1618",
                            repo: repo,
                            path: "package.json",
                        }).then(resultwa => {
                            clientWithAuth.repos.createOrUpdateFile({
                                owner: "anfaas1618",
                                repo: repo,
                                path: "package.json",
                                content: encodedString,
                                message: `update package.json ${"axios"} from ${version_got} to ${version} `,
                                sha: resultwa.data.sha,
                                branch: string = `main`
                            });
                        }).then( preq => {


                            clientWithAuth.pulls.create({
                                owner: owner,
                                repo: repo,
                                title: "chore : dependency update",
                                body: `axios version ${version_got} to ${version}`,
                                head: 'anfaas1618:main',
                                base: 'main',
                            }).then(preqdata => {
                                console.log(preqdata);
                                field.update_pr=preqdata.data.html_url;
                                fields.unshift(field);
                                csvString = [
                                    [
                                        "name",
                                        "repo",
                                        "version",
                                        "version_satisfied",
                                        "update_pr"
                                    ],
                                    ...fields.map(field => [
                                        field.name,
                                        field.repo,
                                        field.version,
                                        field.version_satisfied,
                                        field.update_pr
                                    ])
                                ];
                                fs.writeFile("./test.csv", csvString.join("\r\n"), (err) => {
                                    console.log(err || "done");
                                });
                            });
                        });
                    });
                });

            });
        }
        else
        {
            field.version_satisfied="true";
            field.update_pr="";
            fields.unshift(field);
            csvString = [
                [
                    "name",
                    "repo",
                    "version",
                    "version_satisfied",
                    "update_pr"
                ],
                ...fields.map(field => [
                    field.name,
                    field.repo,
                    field.version,
                    field.version_satisfied,
                    field.update_pr
                ])
            ];
            fs.writeFile("./test.csv", csvString.join("\r\n"), (err) => {
                console.log(err || "done");
            });
        }
        // console.log(csvString);
        //return csvString;

    });
}
