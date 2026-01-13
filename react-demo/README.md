# Outbound.Calls.Softphone.Demo
A demonstration of using the [@outbound-ai/softphone](https://github.com/outbound-ai/softphone/packages/1372803) NPM package package with a [create-react-app](https://create-react-app.dev/) project template.

## Notes
- You will need to configure your ~/.npmrc file like this to access the [@outbound-ai/softphone](https://github.com/outbound-ai/softphone/packages/1372803) NPM package and run ```npm install```.

    ```
    //npm.pkg.github.com/:_authToken={YOUR_PAT_TOKEN_HERE}
    @outbound-ai:registry=https://npm.pkg.github.com
    ```

- You can then use  ```npm run start-local``` to launch this project against a local instance of the call service or ```npm run start-dev``` to launch this project against the call service running in the dev environment. See the package.json file for the environment variables if you want to run this against other deployments of the service.

- If you experience a problem, verify that the package.json is referencing the current version of the [@outbound-ai/softphone](https://github.com/outbound-ai/softphone/packages/1372803) NPM package and run ```npm update```. Sometimes a local reference gets checked in.

