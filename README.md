# SBV Planner - Firebase functions

## Firebase functions used by the SBV Planner Angular App

Functions environment variables that have to be set:

1. Gmail credentials.

```bash
firebase functions:config:set gmail.email="myusername@gmail.com" gmail.password="Gmail password"
```

2. Sender e-mail address. The e-mail address that will be used as sender for all e-mails.

```bash
firebase functions:config:set mode.sendermail="sender@mail.com"
```

3. Development e-mail. E-mail address that all e-mails to users will be sent to when developing.

```bash
firebase functions:config:set mode.developmentemail="email@mail.com"
```

4. Set if you are in development mode. In development mode all e-mails to users will be sent to the e-mail address specified in development e-mail.

```bash
firebase functions:config:set mode.development="true"
```

List your current environment variables:

```bash
firebase functions:config:get
```

Deploy all functions to firebase:

```bash
firebase deploy --only functions
```

Deploy a single functions to firebase:

```bash
firebase deploy --only functions:FUNCTIONNAME
```
