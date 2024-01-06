export const generateUsers = () => {
    const usernames = new Array(255)
        .fill('item')
        .map((_, index) => `test${index}`);
    return usernames;
};
export const sleep = () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(null);
        }, 10_000);
    });
};
