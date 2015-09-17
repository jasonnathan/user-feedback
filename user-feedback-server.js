UserFeedback = new Mongo.Collection("userfeedback");

function isModerator(user) {
    return Meteor.settings && Meteor.settings.userfeedback && Meteor.settings.userfeedback.moderators && !! Meteor.settings.userfeedback.moderators[user];
}
Meteor.startup(function() {
    // text index search requires that index is present
    // try{
    // 	UserFeedback._ensureIndex({"head":"text", "desc":"text"},{weights: {"head": 10, "desc": 5,}});

    // 	console.log('index exists');
    // }catch(e){
    // 	console.log(e);
    // 	console.log('seems like index could not be created - this is needed to do search over topic descriptions. '+
    // 		'You can create the index on mongo command line as db.userfeedback.createIndex({"head":"text", "desc":"text"},{"weights": {"head": 10, "desc": 5,}})');
    // }
});
Meteor.methods({
    initUFB: function() { // this function is called on opens - returns statistics 
        var topicStatus = UserFeedback.find({}, {
            fields: {
                "status": 1
            }
        }).fetch();
        var stats = _.countBy(topicStatus, 'status');
        stats.atTime = new Date();
        var uId = Meteor.userId();
        stats.isModerator = isModerator(uId);
        var statInfo = JSON.stringify(stats);
        var sort_order = {};
        sort_order["likes"] = -1;
        //return articles.find({}, {sort: sort_order, limit: 1});
        stats.topics = UserFeedback.find({}, {
            sort: sort_order,
            limit: 15,
            fields: {
                'head': 1,
                'date': 1,
                'likes': 1,
                'unlikes': 1,
                'category': 1,
                '_id': 1,
                'status': 1,
                'commentCount': 1,
                'username': 1
            }
        }).fetch();
        console.log('ufb: got stats : ' + statInfo + ' topics: ' + stats.topics.length);
        return stats;
    },
    findTopic: function(text, pageNo) {
        check(text, String);

        var res = UserFeedback.find({
            "$text": {
                "$search": text
            }
        }, {
            fields: {
                'head': 1,
                'date': 1,
                'likes': 1,
                'unlikes': 1,
                'category': 1,
                '_id': 1,
                'status': 1,
                'commentCount': 1,
                'username': 1,
                'date': 1
            }
        }).fetch();

        console.log('ufb: findTopic ' + text + ' got ' + res.length);
        return res;
    },
    setTopic: function(head, typ, desc, topicId) {
        if (!Meteor.userId())
            throw new Meteor.Error("log in to create new topic");
        check(head, String);
        check(typ, String);
        check(desc, String);
        var currentUser = Meteor.user(),
            name = currentUser.profile.firstName + ' ' + currentUser.lastName;
        
        if (!topicId) {
            var topic = {
                head: head,
                date: new Date(),
                category: typ,
                desc: desc,
                likes: 0,
                unlikes: 0,
                category: typ,
                commentCount: 0,
                comments: [],
                userSet: {},
                status: "New"
            };


            topic.owner = currentUser._id;
            topic.username = currentUser.username || name;

            topicId = UserFeedback.insert(topic);
            console.log('ufb: new topic ' + head + ' ' + desc + ' ' + typ);
        } else {
            var topic = UserFeedback.findOne({
                '_id': topicId
            });
            if (topic.owner === currentUser._id || isModerator(currentUser._id)) {
                topic.head = head;
                topic.category = typ;
                topic.desc = desc;
                topic.updated = new Date();
                UserFeedback.update({
                    '_id': topicId
                }, topic);
                console.log('ufb: updating topic ' + head + ' ' + desc + ' ' + typ + ' ' + topicId);
            }
        }
        return UserFeedback.findOne({
            '_id': topicId
        });
    },
    getTopicDetails: function(topicId) {
        check(topicId, String);
        return UserFeedback.findOne({
            _id: topicId
        });
    },
    updateTopic: function(topicId, type, comment) {
        if (!Meteor.userId())
            throw new Meteor.Error("log in to type on topic");
        check(comment, String);
        check(type, String);
        var ufb = UserFeedback.findOne({
            _id: topicId
        }, {
            fields: {
                likes: 1,
                unlikes: 1,
                userSet: 1,
                commentCount: 1,
                owner: 1,
                date: 1
            }
        });
        var uId = Meteor.userId();
        var updated = false,
            updateSet = {},
            currentUser = Meteor.user(),
            name = currentUser.profile.firstName + ' ' + currentUser.lastName;

        console.log('ufb: updaing topic id:' + topicId + ' type:' + type + ' comment:' + comment + ' user:' + uId);

        switch (type) {
            case 'likes':
            case 'unlikes':
                if (!ufb.userSet[uId]) {
                    updateSet[type] = ufb[type] + 1
                    updateSet["userSet." + uId] = 1;
                    UserFeedback.update({
                        '_id': topicId
                    }, {
                        "$set": updateSet
                    });
                    updated = true;
                }
                break;
            case 'clikes':
            case 'cunlikes':
                if (!ufb.userSet[uId + '-' + comment]) {
                    var inc = type === 'clikes' ? 1 : -1;
                    updateSet["userSet." + uId + '-' + comment] = inc;
                    UserFeedback.update({
                        _id: topicId,
                        "comments.id": parseInt(comment)
                    }, {
                        "$inc": {
                            "comments.$.rating": inc
                        },
                        "$set": updateSet
                    });
                    updated = true;
                }
                break;
            case 'accept-answer':
                UserFeedback.update({
                    _id: topicId,
                    "comments.id": parseInt(comment)
                }, {
                    "$set": {
                        "comments.$.accepted": true,
                        "status": "Solved"
                    }
                });
                updated = true;
                break;
            case 'remove-comment':
                UserFeedback.update({
                    _id: topicId,
                    "comments.id": parseInt(comment)
                }, {
                    "$set": {
                        "comments.$.removed": true
                    }
                });
                updated = true;
                break;
            case 'comment':
                var cmt = {
                    "desc": comment,
                    "date": new Date(),
                    "rating": 0
                };
                cmt.user = currentUser._id;
                cmt.uName = currentUser.username || name;
                cmt.id = ufb.commentCount + 1;
                UserFeedback.update({
                    _id: topicId
                }, {
                    "$push": {
                        "comments": cmt
                    },
                    "$set": {
                        commentCount: cmt.id
                    }
                });
                updated = true;
                break;
            case 'status':
                if (ufb.owner === Meteor.userId() || isModerator(Meteor.userId())) {
                    UserFeedback.update({
                        '_id': topicId
                    }, {
                        "$set": {
                            "status": comment
                        }
                    });
                    updated = true;
                }
                break;
        }

        console.log("ufb: updateTopic - " + (updated ? "successfully updated" : "not updated for some reason"));

        return UserFeedback.findOne({
            '_id': topicId
        });
    }

});