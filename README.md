# MegaAnuluca
基于 Vue3+Typescript 开发的个人网站

### 使用的node版本

### 推到git-pages
cd ./dist
git pull
git rm -r --cached .
git add .
git commit -m 'a'
git push -u 

注意：不要修改CNAME文件
CNAME文件为第一次给github pages配置Custom domain时自动生成的文件，如果删除会导致Custom domain设置清空

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
