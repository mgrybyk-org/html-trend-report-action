declare module 'allure-commandline' {
    function allure(args: string[]): ChildProcess

    export default allure
}
