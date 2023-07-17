-- 创建数据库
CREATE DATABASE IF NOT EXISTS Word1;

-- 使用数据库
USE Word1;

-- 创建用户表
CREATE TABLE IF NOT EXISTS User (
  user_id INT PRIMARY KEY,
  user_name VARCHAR(255)
);

-- 创建单词表
CREATE TABLE IF NOT EXISTS Word (
  word_id INT PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  trans VARCHAR(255)
);

-- 创建分类表
CREATE TABLE IF NOT EXISTS Category (
  category_id INT PRIMARY KEY,
  category_name VARCHAR(255)
);

-- 创建分类-单词关系表
CREATE TABLE IF NOT EXISTS category_word (
  category_word_id INT PRIMARY KEY,
  category_id INT,
  word_id INT,
  FOREIGN KEY (category_id) REFERENCES Category(category_id),
  FOREIGN KEY (word_id) REFERENCES Word(word_id)
);

-- 创建用户-单词关系表
CREATE TABLE IF NOT EXISTS user_word (
  user_word_id INT PRIMARY KEY,
  user_id INT,
  word_id INT,
  trans VARCHAR(255),
  difficulty INT,
  FOREIGN KEY (user_id) REFERENCES User(user_id),
  FOREIGN KEY (word_id) REFERENCES Word(word_id)
);

-- 插入示例数据
INSERT INTO User (user_id, user_name) VALUES (1, 'John');
INSERT INTO User (user_id, user_name) VALUES (2, 'Jane');

INSERT INTO Word (word_id, name, trans) VALUES (1, 'apple', '苹果');
INSERT INTO Word (word_id, name, trans) VALUES (2, 'banana', '香蕉');

INSERT INTO Category (category_id, category_name) VALUES (1, 'Fruits');
INSERT INTO Category (category_id, category_name) VALUES (2, 'Vegetables');

INSERT INTO category_word (category_word_id, category_id, word_id) VALUES (1, 1, 1);
INSERT INTO category_word (category_word_id, category_id, word_id) VALUES (2, 2, 2);

INSERT INTO user_word (user_word_id, user_id, word_id, trans, difficulty) VALUES (1, 1, 1, '苹果', 3);
INSERT INTO user_word (user_word_id, user_id, word_id, trans, difficulty) VALUES (2, 2, 2, '香蕉', 2);




mysql生成 sql语句
数据库名字：Word1

用户表（User）
user_id (主键)
user_name (用户名)
==================

单词表（Word）
word_id (主键)
name (单词)   # 唯一索引
trans (意思)


分类表（Category）
category_id (主键)
category_name (分类名称)  #唯一索引

分类-单词关系表 category_word
category_word_id  (主键)
category_id (外键，关联到用户表的category_id)
word_id (外键，关联到单词表的word_id)

用户-单词关系表（user_word）
user_word_id  (主键)
user_id (外键，关联到用户表的user_id)
word_id (外键，关联到单词表的word_id)
trans
difficulty