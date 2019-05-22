-- @author Luka Kralj
USE SmartHomeDB;

DELETE FROM Components;
DELETE FROM AccessTokens;
DELETE FROM Users;

INSERT INTO Users VALUES ("admin","cf70e9527e1c182661dc3b1c4b403eac193b1d02b66342e20a56b9b1e8277b2087f7845056ebf44718841574f7d4a50a281dc852817b656e603bddec21737c4c","yes","6d85e7f089f59d01ba49f3c18fd49a019041baa9e3dfc90ece5697d053a5f5e9",'3996',"luka.kralj2@gmail.com");
