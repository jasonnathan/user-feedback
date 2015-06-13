## user-feedback 
### - collect, share & manage ideas & issues 

This module allows you to easily add User Idea Generation and Issue Reporting functionality into your Meteor project.

### Add the package to your module 

**meteor add viloma:user-feedback**

add this to show the feedback link.
```html
{{> userfblink}} 
```

if you dont want to include it directly in project instead of as a popup add
```html
{{> userfeedback}}
```

To use custom categories instead of the built in ones
settings.json 
```javascript
{
	"public": {
		"userfeedback": {
			"categories": [
				{"desc":"Feature Ideas", "id":"idea"},
				{"desc":"Technical Issues", "id":"issue"},
				{"desc":"General Feedback", "id":"general"}
			]	
		}
	}
}
```

To select users that are moderators for your site add this to settings.json
```javascript
{
	"userfeedback": {
		"moderators": {
			"your moderator user id 1 ..": 1,
			"your moderator user id 2 ..": 1
		}
	}
}
```

### Details:
- Visitors can view the feedback without signing in
- Only signed in users can create new topics or comment on them.

### To be added
- surveys
- private ideas
- moderators

