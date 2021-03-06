// Write your package code here!
UI.registerHelper('ufbmatches', function(foo, bar1, bar2, bar3, bar4) {
    return (foo === bar1 || foo === bar2 || foo === bar3 || foo === bar4);
});

UI.registerHelper('ufbsort', function(array, field, ord) {
    console.log('sort called ' + array + ' ' + field + " ord " + ord);
    if (ord === "desc")
        return _.sortBy(array, function(item) {
            return -item[field];
        });
    return _.sortBy(array, function(item) {
        return item[field];
    });
});

function updateTopic(topicId, type, comment) {
    Meteor.call("updateTopic", topicId, type, comment, function(err, res) {
        if (!err)
            Session.set('currTopic', res);
        else
            alert(err);
    });
}

ufbFormatDate = function(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ampm;
    return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + strTime;
}
UI.registerHelper('ufbFormatDate', ufbFormatDate);


Template.userfblink.helpers({
    showFb: function() {
        return Session.get('showFb');
    }
});

Template.userfblink.events({
//    "click .ufb-button": function(event) {
//        //$('.ufb-page').css('display','block');
//        Session.set('showFb', true);
//    },
    "click .feedbackDDtext":function(e, tmpl) {
        e.preventDefault();
        var text= $('.feedbackDDtext').text();
        tmpl.dropdownItem(text); 
    }
});
Template.userfeedback.rendered = function() {
     $('.dropdown-toggle').dropdown()
    window.showDetails= function(element){
        //console.log(document.getElementsByClassName("dropdBtText"))
        $('.dropdBtText').html(element.innerHTML)
    //document.getElementsByClassName("dropdBtText")
        //document.getElementsByClassName("dropdBtText")[0].innerHTML = element.innerHTML;
}
    
    if (!this.rendered) {
        this.rendered = true;
        // initialize user feedback - get starting list, Stats and isModerator
        Meteor.call("initUFB", function(err, asyncValue) {
            if (err)
                console.log(err);
            else {
                Session.set('ufb-list', asyncValue.topics);
                Session.set('isModerator', asyncValue.isModerator);
                var newCount = 0;
                if (asyncValue.New)
                    newCount = asyncValue.New;
                var solvedCount = 0;
                if (asyncValue.Solved)
                    solvedCount = asyncValue.Solved;
                Session.set('ufb-stats', "New: " + newCount + " / Solved: " + solvedCount);
            }
        });

    }
    var self = this;
    var updateDimensions = _.debounce(function(e) {
        self.containerHeight($(window).innerHeight());
    });

    window.addEventListener("resize", updateDimensions, false);

    updateDimensions();
};

Template.userfeedback.helpers({
    selectTextDropdown: function() {
        return Template.instance().dropdownItem() || "Please Select a Topic";
    },
    topicCount: function() {
        return Session.get('ufb-stats');
    },
    categories: function() {
        // if topic types overridden in config use those 
        if (Meteor.settings && Meteor.settings.public && Meteor.settings.public.userfeedback && Meteor.settings.public.userfeedback.categories) {
            return Meteor.settings.public.userfeedback.categories;
        } else
            return [{
                desc: "Feature Ideas",
                id: "Idea"
            }, {
                desc: "Technical Issues",
                id: "Issue"
            }, {
                desc: "General Feedback",
                id: "General"
            }];
    },
    topicList: function() {
        return Session.get('ufb-list');
    },
    currTopic: function() {
        return Session.get('currTopic');
    },
    readonly: function() {
        var currTopic = Session.get('currTopic');
        var isModerator = Session.get('isModerator');
        console.log("Is Owner:", currTopic.owner, Meteor.userId())
        // if you own the current topic or are the moderator then not readonly 
        if (currTopic.owner === Meteor.userId() || isModerator === true)
            return null;

        return "readonly";
    },
    isOwner: function() {
        var uid = Meteor.userId();
        if (!uid)
            return false;

        return uid === this.owner;
    },
    projectsHeight: function() {
        var height = Template.instance().containerHeight();
        return !!height ? height - 116 : 0;
    },
    isSubmitDisabled: function() {
        return Template.instance().isSubmitDisabled();
    },
});
Template.userfeedback.events({
    "click .ufb-close": function(event) {
        Session.set('showFb', false);
    },
    "click .ufb-topic-close": function(event) {
        Session.set('showFb', false);
    },
    "submit .ufb-search-form": function(event) {
        // search box - find result of topic
        var text = $('.ufb-search').val();
        Session.set('currTopic', null);
        Meteor.call("findTopic", text, function(err, asyncValue) {
            if (err)
                console.log(err);
            else {
                Session.set('ufb-list', asyncValue);
            }
        });
        // Prevent default form submit
        return false;
    },
    "click .ufb-search-button": function(event) {
        $('.changeAnimation').removeClass("fadeInDown").addClass("fadeOutUp");
        return Meteor.setTimeout(function() {
            return Session.set('currTopic', null);
        }, 275);


    },
    "click .ufb-new": function(event) {
        // create a new topic
        Session.set('currTopic', {
            owner: Meteor.userId(),
            username: Meteor.user().name(),
            desc: "",
            date: new Date()
        });
        return false;
    },
    "click .ufb-accept-answer": function(event) {
        var currTopic = Session.get("currTopic");
        var cmtId = event.target.id.substring(3);
        updateTopic(currTopic._id, "accept-answer", cmtId);
    },
    "click .ufb-remove-comment": function(event) {
        var currTopic = Session.get("currTopic");
        var cmtId = event.target.id.substring(3);
        updateTopic(currTopic._id, "remove-comment", cmtId);
    },
    "click .ufb-edit-button": function(event, tmpl) {
        Session.set("currTopic", this);
    },
    "click .ufb-delete-button": function(event, tmpl) {
        Meteor.call("removeTopic", this._id, function(err, result) {
            if (err) {
                return alert(err);
            }
            return Meteor.call("initUFB", function(err, asyncValue) {
                if (err)
                    console.log(err);
                else {
                    Session.set('ufb-list', asyncValue.topics);
                    Session.set('isModerator', asyncValue.isModerator);
                    var newCount = 0;
                    if (asyncValue.New)
                        newCount = asyncValue.New;
                    var solvedCount = 0;
                    if (asyncValue.Solved)
                        solvedCount = asyncValue.Solved;
                    Session.set('ufb-stats', "New: " + newCount + " / Solved: " + solvedCount);
                }
            });

        })
    },
    "click .ufb-save-button": function(event) {
        console.log("Saved clicked")
        var currTopic = Session.get("currTopic");
        var currTopicId;
        // if it not new topic - then pass the curr topic id 
        if (currTopic)
            currTopicId = currTopic._id;
        var head = $('.ufb-textbox').val();
        var typ = $('.ufb-type-input').val();
        var desc = $('.ufb-textdesc').val();
        Meteor.call("setTopic", head, typ, desc, currTopicId, function(err, res) {
            if (!err) {
                Session.set('currTopic', null);
                return Meteor.call("initUFB", function(err, asyncValue) {
                    if (err)
                        console.log(err);
                    else {
                        Session.set('ufb-list', asyncValue.topics);
                        Session.set('isModerator', asyncValue.isModerator);
                        var newCount = 0;
                        if (asyncValue.New)
                            newCount = asyncValue.New;
                        var solvedCount = 0;
                        if (asyncValue.Solved)
                            solvedCount = asyncValue.Solved;
                        Session.set('ufb-stats', "New: " + newCount + " / Solved: " + solvedCount);
                    }
                });
            }

            alert(err);
        });
    },
    "click .ufb-topic": function(e) {
        var k = e.target.id;
        // get the fill topic
        Meteor.call("getTopicDetails", k, function(err, res) {
            if (!err)
                Session.set('currTopic', res);
            else
                alert(err);
        });
        return false;
    },
    "click .ufb-comment-save": function(e) {
        var text = $('.ufb-comment-input').val();
        $('.ufb-comment-input').val("");
        var currTopic = Session.get("currTopic");
        updateTopic(currTopic._id, "comment", text);
        return false;
    },
    "click .ufb-unlike-button": function(e) {
        var currTopic = Session.get("currTopic");
        updateTopic(currTopic._id, "unlikes", "");
        return false;
    },
    "click .ufb-like-button": function(e) {
        var currTopic = Session.get("currTopic");
        updateTopic(currTopic._id, "likes", "");
        return false;
    },
    "click .ufb-rating-up": function(e) {
        var currTopic = Session.get("currTopic");
        var cmtId = e.target.id.substring(3);
        updateTopic(currTopic._id, "clikes", cmtId);
        return false;
    },
    "click .ufb-rating-down": function(e) {
        var currTopic = Session.get("currTopic");
        var cmtId = e.target.id.substring(3);
        updateTopic(currTopic._id, "cunlikes", cmtId);
        return false;
    },
    "change .ufb-status-box": function(e) {
        var val = $('#' + e.target.id).val();
        if ($('#' + e.target.id).attr('orig') !== val) {
            var currTopic = Session.get("currTopic");
            console.log('combobox ' + e.target.id + '=' + val);
            updateTopic(currTopic._id, "status", val);
        }
    },
    
    'blur .validateFeedback, change .validateFeedback, keyup .validateFeedback': function(event, tmpl) {
        var element = $(event.currentTarget),
        required = element.attr('data-required'),
        setError = function (message) {
        tmpl.isSubmitDisabled("disabled");
        }
        setOkay = function (message) {
            tmpl.isSubmitDisabled("");
        }
        if (required === true) {
            return setError();
        } else {
            return setOkay();
        }
},
    'click #goBack': function (e, tmpl) {
        e.preventDefault();
        window.history.back();

    }

});
Template.userfeedback.created = function() {
    var self = this;
    self.containerHeight = HD.Observable();
    self.dropdownItem = HD.Observable();
    self.isSubmitDisabled = HD.Observable("disabled");
    self.autorun(function(){
        var list = Session.get('ufb-list');
        
        var hasTopics = list ? Session.get('ufb-list').length > 0 : true;
        
        if(hasTopics){
            return false;
        }
        
        return Meteor.user() ? Session.set('currTopic', {
            owner: Meteor.userId(),
            username: Meteor.user().name(),
            desc: "",
            date: new Date()
        }) : {};
        
    });
}