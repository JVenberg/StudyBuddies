
var search = $('input.autocomplete');
var course_data = {};
var curr_data = {};
var number_data = {};
var user_courses = {};

$(document).ready(function(){
  $('#addCourse').modal({
    ready: function(modal, trigger) { // Callback for Modal open. Modal and trigger parameters available.
      focusSearch();
    },
    complete: function(modal, trigger) {
      $("#autocomplete-input").val("");
      updateCourseTable(null, {});
    },
    startingTop: '0%', // Starting top style attribute
    endingTop: '0%', // Ending top style attribute
  });
  $('#confirmRemoveCourse').modal();
  $('#inboxModal').modal();
  $('#userInfo').modal({
    ready: function(modal, trigger) {
      var ch = $('.carousel-item').height();
      $(".carousel-item").css({'max-width':ch/2+'px'});
      $(".carousel-item").css({"left":"calc(50% - " + ch/4 + "px)"});
      $("#userInfo").css({'max-width':ch/2 + 200+'px'})
      $('.carousel.carousel-slider').carousel({
        duration: 200,
        fullWidth: true,
        indicators: false,
        noWrap: false,
        padding: 300,
      });
      $('.carousel.carousel-slider').carousel("set", carouselIndex);
    }
  });
});

function authChange(uid, data) {
  console.log(uid);
  db.ref('users/' + uid + '/courses').on('value', function(snapshot) {
    userCoursesUpdated(snapshot);
  });
  db.ref("inbox/" + uid).on("value", function(snapshot) {
    inboxUpdated(snapshot);
  });
  db.ref("matches").orderByChild(uid).startAt(true).endAt(true).on("value", function(snapshot) {
    matchesUpdated(snapshot);
  });
}

function matchesUpdated(snapshot) {
  var matches = snapshot.val();
  var matchedIds = []
  for (var matchKey in matches) {
    var match = matches[matchKey]
    var isTwo = Object.keys(match).length > 1;
    if (isTwo) {
      var otherUid;
      for (var userId in match) {
        if (userId != uid) {
          otherUid = userId;
        }
      }
      matchedIds.push(otherUid);
    }
  }
  var collection = document.getElementById("matchedCollection");
  collection.innerHTML = "";
  if (matchedIds.length > 0) {
    matchUsersToUpdate = [];
    for (var i = 0; i < matchedIds.length; i++) {
      var userId = matchedIds[i];
      var avatarItem = document.createElement("li");
      avatarItem.classList = "collection-item avatar";
      var img = document.createElement("img");
      img.classList = "circle";
      img.id = userId + "_match_img";
      var title = document.createElement("span");
      title.classList = "title";
      title.id = userId + "_match_title";
      var content = document.createElement("p");
      content.id = userId + "_match_content";
      // var secondaryContent = document.createElement("a");
      // secondaryContent.classList = "secondary-content waves-effect waves-light btn-flat purple white-text"
      // secondaryContent.innerHTML = "<span class='hide-on-small-only'>More </span>Info";
      // secondaryContent.dataset.classId = courseId;
      // secondaryContent.dataset.userIndex = index;
      // index++;
      avatarItem.appendChild(img);
      avatarItem.appendChild(title);
      avatarItem.appendChild(content);
      // avatarItem.appendChild(secondaryContent);
      collection.appendChild(avatarItem);
      matchUsersToUpdate.push(userId);
    }
    for (var i = 0; i < matchUsersToUpdate.length; i++) {
      var usersToUpdateID = matchUsersToUpdate[i];
      db.ref("users/" + usersToUpdateID).once("value").then(function(snapshot) {
        var usersToUpdateID = snapshot.key;
        var data = snapshot.val();
        if (data["photoURL"]) {
          document.getElementById(usersToUpdateID + "_match_img").src = data["photoURL"];
        } else {
          document.getElementById(usersToUpdateID + "_match_img").src = "defaultprofile.jpg"
        }
        document.getElementById(usersToUpdateID + "_match_title").innerHTML = data["first"] + " " + data["last"];
        document.getElementById(usersToUpdateID + "_match_content").innerHTML = "<p>" + data["year"] + "</p>";
        document.getElementById(usersToUpdateID + "_match_content").innerHTML += "<p>" + data["phone"] + "</p>";
        document.getElementById(usersToUpdateID + "_match_content").innerHTML += "<p>" + data["email"] + "</p>";
      });
    }
  } else {
    var noMatch = document.createElement("li");
    noMatch.classList = "collection-item center";
    noMatch.innerHTML = "<div class='chip'>No Matches</div>";
    collection.appendChild(noMatch);
  }
}

function userCoursesUpdated(snapshot) {
  user_courses = snapshot.val();
  var opened;
  $(".collapsible-header.active > .not-collapse > i").each(function() {
    opened = this.dataset.courseNumber;
  })

  $(".collapsible-header > .not-collapse > i").each(function() {
    db.ref('user_courses/' + this.dataset.courseNumber).off()
  })

  coursesUpdated(user_courses, opened);
  for (var cid in user_courses) {
    db.ref('user_courses/' + cid).on('value', function(snapshot) {
      courseUpdated(snapshot, snapshot.key);
    });
  }

  $(':checkbox').change(function() {
    db.ref("users/" + uid + "/courses/" + this.id.replace("_checkbox", "") + "/enabled").set(this.checked);
    if (this.checked) {
      db.ref('user_courses/' + this.id.replace("_checkbox", "") + "/" + uid).set(true);
    } else {
      db.ref('user_courses/' + this.id.replace("_checkbox", "") + "/" + uid).remove();
    }
    updateSwitch(this.id.replace("_checkbox", ""), this.checked);
  });
  $(':checkbox').each(function() {
    updateSwitch(this.id.replace("_checkbox", ""), this.checked);
  });
}

var previousMatches;
function inboxUpdated(snapshot) {
  var unread = 0;
  var inbox = snapshot.val();
  for (var sender in inbox) {
    var read = inbox[sender]["read"];
    if (!read) {
      unread++;
    }
    console.log(unread);
  }
  if (previousMatches != undefined && previousMatches < unread) {
    Materialize.toast("New Potential Match!", 2000);
  }
  previousMatches = unread;
  $(".badge").each(function() {
    this.innerHTML = unread;
    if (unread > 0) {
      this.style.display = "inline-block";
    } else {
      this.style.display = "none";
    }
  });
  courseUpdated(snapshot, "inbox", true);
  updateInfoModal("inbox/" + uid)
}

function courseUpdated(snapshot, courseId, inbox) {
  var user_data = snapshot.val();
  if (inbox) {
    var bodyElement = document.getElementById("inboxContent");
  } else {
    var bodyElement = document.getElementById(courseId + "_list").children[1];
  }
  bodyElement.innerHTML = "";

  var collectionContainer = document.createElement("div");
  collectionContainer.style = "max-height:300px;overflow:auto;"
  var collection = document.createElement("ul");
  collection.classList = "collection";

  if (user_data != null) {
    var disabledUsers = user_data[uid];
    var usersToUpdate = [];
    index = 0;
    for (var userId in user_data) {
      if (userId != uid && (disabledUsers == undefined || disabledUsers[userId] == undefined)) {
        var avatarItem = document.createElement("li");
        avatarItem.classList = "collection-item avatar";
        var img = document.createElement("img");
        img.classList = "circle";
        img.classList += " " + userId + "_img";
        var title = document.createElement("span");
        title.classList = "title";
        title.classList += " " + userId + "_title";
        var content = document.createElement("p");
        content.classList += " " + userId + "_content";
        var secondaryContent = document.createElement("a");
        secondaryContent.classList = "secondary-content waves-effect waves-light btn-flat purple white-text"
        secondaryContent.innerHTML = "<span class='hide-on-small-only'>More </span>Info";
        secondaryContent.dataset.classId = courseId;
        secondaryContent.dataset.userIndex = index;
        index++;
        avatarItem.appendChild(img);
        avatarItem.appendChild(title);
        avatarItem.appendChild(content);
        avatarItem.appendChild(secondaryContent);
        collection.appendChild(avatarItem);
        usersToUpdate.push(userId);
      }
    }
    if (usersToUpdate.length == 0) {
      var noUser = document.createElement("li");
      noUser.classList = "collection-item center";
      noUser.innerHTML = "<div class='chip'>No New Classmates</div>";
      collection.appendChild(noUser);
    } else if (!inbox) {
      var usersLabel = document.createElement("h5");
      usersLabel.classList = "center";
      usersLabel.innerHTML = "New Classmates";
      bodyElement.appendChild(usersLabel);
    }
    collectionContainer.appendChild(collection);
    bodyElement.appendChild(collectionContainer);
    $('.secondary-content').on("click touchend", userInfoClicked);

    for (var i = 0; i < usersToUpdate.length; i++) {
      var usersToUpdateID = usersToUpdate[i];
      db.ref("shared_data/public_data/" + usersToUpdateID).once("value").then(function(snapshot) {
        var usersToUpdateID = snapshot.key;
        var data = snapshot.val();
        $("." + usersToUpdateID + "_img").each(function() {
          if (data["photoURL"]) {
            this.src = data["photoURL"];
          } else {
            this.src = "defaultprofile.jpg"
          }
        });
        $("." + usersToUpdateID + "_title").each(function() {
          this.innerHTML = data["first"] + " " + data["last"];
        });
        $("." + usersToUpdateID + "_content").each(function() {
          this.innerHTML = "<p>" + data["year"] + "</p>";
        });
      });
    }
    if ($("#userInfo").hasClass("open")) {
      updateInfoModal('user_courses/' + cidInfoPopup);
    }
  }
}

var carouselIndex;
var cidInfoPopup;
function userInfoClicked() {
  cidInfoPopup = this.dataset.classId;
  carouselIndex = this.dataset.userIndex;
  if (cidInfoPopup == "inbox") {
    updateInfoModal("inbox/" + uid, true);
  } else {
    $("#userInfo").css({"z-index": "1009"})
    updateInfoModal('user_courses/' + cidInfoPopup, true);

  }
}

function closeInfo() {
  $('#userInfo').modal('close');
}

function updateInfoModal(refStr, openModal) {
  console.log(cidInfoPopup);
  db.ref(refStr).once('value', function(snapshot) {
    // console.log(snapshot.key, snapshot.val());

    $('.carousel.carousel-slider').carousel("destroy");
    $(".carousel-item").each(function(i) {
      this.remove();
    })
    var user_data = snapshot.val();
    if (user_data != undefined) {
      var disabledUsers = user_data[uid];
      var usersToUpdate = [];

      var carouselContainer = document.getElementById("infoCarousel");
      var index = 0;
      for (var userId in user_data) {
        if (userId != uid && (disabledUsers == undefined || disabledUsers[userId] == undefined)) {
          usersToUpdate.push(userId);
          var carouselItem = document.createElement("div");
          carouselItem.href = "#one";
          carouselItem.classList = "carousel-item";
          if (index == carouselIndex) {
            carouselItem.classList += " active";
          }
          var card = document.createElement("div");
          card.classList = "card";
          var cardImage = document.createElement("div");
          cardImage.classList = "card-image";
          
          var closeIconBtn = document.createElement("a");
          closeIconBtn.classList = "infoClose btn-floating btn-large waves-effect waves-light purple";
          var closeIcon = document.createElement("i");
          closeIcon.classList = "material-icons small right";
          closeIcon.innerHTML = "close";
          var hideBtn = document.createElement("a");
          hideBtn.classList = "hideUser btn-floating btn-large waves-effect waves-light red";
          hideBtn.dataset.userId = userId;
          hideBtn.dataset.courseId = snapshot.key;
          hideBtn.dataset.index = index;
          var hideIcon = document.createElement("i");
          hideIcon.classList = "material-icons small right";
          hideIcon.innerHTML = "close";
          var addBtn = document.createElement("a");
          addBtn.classList = "addUser btn-floating btn-large waves-effect waves-light green";
          addBtn.dataset.userId = userId;
          addBtn.dataset.courseId = snapshot.key;
          addBtn.dataset.index = index;
          index++;
          var addIcon = document.createElement("i");
          addIcon.classList = "material-icons small right";
          addIcon.innerHTML = "check";
         
          var cardImgElement = document.createElement("img");
          cardImgElement.src = "defaultprofile.jpg";
          cardImgElement.id = userId + "_img"

          var cardContent = document.createElement("div");
          cardContent.classList = "card-content";
          var title = document.createElement("title");
          title.classList = "card-title";
          title.id = userId + "_title"
          var year = document.createElement("h6");
          year.id = userId + "_year";
          var bio = document.createElement("p");
          bio.classList = "flow-text";
          bio.id = userId + "_bio";

          closeIconBtn.appendChild(closeIcon);
          cardImage.appendChild(closeIconBtn);
          hideBtn.appendChild(hideIcon);
          cardImage.appendChild(hideBtn);
          addBtn.appendChild(addIcon);
          cardImage.appendChild(addBtn);
          cardImage.appendChild(cardImgElement)
          card.appendChild(cardImage);
          
          cardContent.appendChild(title);
          cardContent.appendChild(year);
          cardContent.appendChild(bio);
          card.appendChild(cardContent);

          carouselItem.appendChild(card);
          carouselContainer.appendChild(carouselItem);
        }
      }

      for (var i = 0; i < usersToUpdate.length; i++) {
        var usersToUpdateID = usersToUpdate[i];
        db.ref("shared_data/public_data/" + usersToUpdateID).once("value").then(function(snapshot) {
          var usersToUpdateID = snapshot.key;
          var data = snapshot.val();
          $("#" + usersToUpdateID + "_img").each(function() {
            if (data["photoURL"]) {
              this.src = data["photoURL"];
            } else {
              this.src = "defaultprofile.jpg"
            }
          });
          $("#" + usersToUpdateID + "_title").each(function() {
            this.innerHTML = data["first"] + " " + data["last"];
          });
          $("#" + usersToUpdateID + "_year").each(function() {
            this.innerHTML = data["year"];
          });
          $("#" + usersToUpdateID + "_bio").each(function() {
            this.innerHTML = data["bio"];
          });
        });
      }
      $(".infoClose").on("click touchend", closeInfo);
      $(".hideUser").on("click touchend", hideUser);
      $(".addUser").on("click touchend", addUser);
      if (openModal) {
        $("#userInfo").modal("open");
      }

      if(usersToUpdate.length < 1) {
        $("#userInfo").modal("close");
      }
    } else {
      $("#userInfo").modal("close");
    }
  });
}

function addUser(e) {
  disableUser(this);
  checkIfMatched(this);
}

function checkIfMatched(passedThis) {
  db.ref("matches/" + combineStrings(uid, passedThis.dataset.userId) + "/" + uid).once("value").then(function(snapshot) {
    if (snapshot.val()) {
      console.log("IT'S A MATCH!");
    } else {
      db.ref("inbox/" + passedThis.dataset.userId + "/" + uid).set({
        read: false
      }).then(function() {
        console.log("Added to inbox");
      })
    }
    db.ref("matches/" + combineStrings(uid, passedThis.dataset.userId) + "/" + passedThis.dataset.userId).set(true).then(function() {
      console.log("Added to matches");
    })
  })
}

function hideUser(e) {
  console.log(":(");
  disableUser(this);
}

function disableUser(passedThis) {
  var userId = passedThis.dataset.userId;
  var courseId = passedThis.dataset.courseId;
  var index = passedThis.dataset.index;
  if (index > 1) {
    carouselIndex = index - 1;
  } else {
    carouselIndex = 0;
  }
  if (courseId == uid) {
    db.ref("inbox/" + uid + "/" + userId).remove();
  } else {
    // $('#userInfo').modal('close');
    db.ref("user_courses/" + courseId + "/" + uid + "/" + userId).set(true).then(function() {
      var ch = $('.carousel-item').height();
      $(".carousel-item").css({'max-width':ch/2+'px'});
      $(".carousel-item").css({"left":"calc(50% - " + ch/4 + "px)"});
      $('.carousel.carousel-slider').carousel({
          duration: 200,
          fullWidth: true,
          indicators: false,
          noWrap: false,
          padding: 300,
      });
      $('.carousel.carousel-slider').carousel("set", carouselIndex);
    });
  }
  
}

function updateSwitch(id, checked) {
  // console.log(id, checked);
  var listElement = document.getElementById(id + "_list");
  if (checked) {
    listElement.classList = "";
    $(listElement).off("click");
  } else {
    $('.collapsible').collapsible("close", listElement.dataset.index);
    listElement.classList = "disabled not-collapse";
    $(listElement).on("click", function(e) { e.stopPropagation(); });
  }
}

/* ADD COURSES FUNCTION */

$("#addCourseBtn").one("click", function() {
  db.ref('curriculum_search').once("value").then(function(snapshot) {
    course_data = snapshot.val();
    for (var currName in course_data) {
      curr_data[currName] = null;
    }
    search.bind('input', inputUpdated);
    inputUpdated();
  });
});

function inputUpdated() {
  var currMatch = search.val().match("([A-z]| )+");
  if (currMatch != null) {
    var curr = search.val().match("([A-z]| )+")[0].trim().toUpperCase();
    if (curr in course_data) {
      if (course_data[curr] == true) {
        console.log("First");
        db.ref('courses_search/' + curr).once("value").then(function(snapshot) {
          var num_snap = snapshot.val();
          course_data[curr] = num_snap;
          if (!(curr in number_data)) {
            number_data[curr] = {}
          }
          for (var num in num_snap) {
            number_data[curr][curr + " " + num] = null;
          }
          search.autocomplete({
            data: number_data[curr],
            limit: 5, // The max amount of results that can be shown at once. Default: Infinity.
            onAutocomplete: inputUpdated,
            minLength: 1
          });
          updateCourseTable(curr, course_data[curr]);
        });
      } else {
        console.log("Repeat");
        search.autocomplete({
          data: number_data[curr],
          limit: 5, // The max amount of results that can be shown at once. Default: Infinity.
          onAutocomplete: inputUpdated,
          minLength: 1
        });
      }
    } else {
      search.autocomplete({
        data: curr_data,
        limit: 5, // The max amount of results that can be shown at once. Default: Infinity.
        onAutocomplete: inputUpdated,
        minLength: 1
      });
    }
  }
  updateCourseTable(curr, course_data[curr]);
}

function changeClass() {
  var courseData = this.dataset.courseNumber;
  if (this.innerHTML == "close") {
    this.innerHTML = "add";
    db.ref('users/' + uid + '/courses/' + courseData).remove();
    db.ref('user_courses/' + courseData + "/" + uid).remove();
    Materialize.toast("Removed course: " + courseData.replace("-", " ").replace("_", " "), 1000);
  } else {
    this.innerHTML = "close";
    var id = courseData.split("_");
    var data = {};
    data[courseData] = {
      name: course_data[id[0].replace("-", " ")][id[1]],
      enabled: true
    };
    db.ref('users/' + uid + '/courses').update(data);
    db.ref('user_courses/' + courseData + "/" + uid).set(true);
    Materialize.toast("Added course: " + courseData.replace("-", " ").replace("_", " "), 1000);
  }
}

function confirmDeletePopup() {
  var courseData = this.dataset.courseNumber;
  var deleteBtn = document.getElementById("confirmDeleteBtn");
  document.getElementById("courseConfirmId").innerHTML = courseData.replace("-", " ").replace("_", " ");
  deleteBtn.dataset.courseNumber = courseData;
  deleteBtn.onclick = deleteConfirmed;
  $('#confirmRemoveCourse').modal('open');
}

function deleteConfirmed() {
  var courseData = this.dataset.courseNumber;
  db.ref('users/' + uid + '/courses/' + courseData).remove();
  db.ref('user_courses/' + courseData + "/" + uid).remove();
  Materialize.toast("Removed course: " + courseData.replace("-", " ").replace("_", " "), 1000);
}

function coursesUpdated(data, openedId) {
  var classlist = document.getElementById("class-list");
  classlist.innerHTML = "";
  if (data != null) {
    var index = 0;
    for (var key in data) {
      var curr = key.split("_")[0];
      var num = key.split("_")[1];
      var name = data[key].name;
      var enabled = data[key].enabled;
      var courseId = key;
      var listElement = document.createElement("li");
      listElement.id = courseId + "_list";
      listElement.dataset.index = index;
      index++;
      var header = document.createElement("div");
      header.classList = "collapsible-header";
      var courseName = document.createElement("div");
      courseName.classList = "truncate trunc-name";
      courseName.innerHTML = curr.replace("-", " ") + " " + num + " - " + name;
      header.appendChild(courseName);
      var rightDiv = document.createElement("div");
      rightDiv.classList = "not-collapse";
      var toggleDiv = document.createElement("div");
      toggleDiv.classList = "switch class-toggle";
      var toggle = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = enabled;
      input.id = courseId + "_checkbox";
      input.classList = "class-checkbox";
      toggle.appendChild(input);
      var span = document.createElement("span");
      span.classList = "lever";
      toggle.appendChild(input);
      toggle.appendChild(span);
      toggleDiv.appendChild(toggle);
      rightDiv.appendChild(toggleDiv);
      var removeBtn = document.createElement("i");
      removeBtn.classList = "material-icons class-remove-btn";
      removeBtn.innerHTML = "close";
      removeBtn.onclick = confirmDeletePopup;
      removeBtn.dataset.courseNumber = courseId;
      rightDiv.appendChild(removeBtn);
      header.appendChild(rightDiv);
      var body = document.createElement("div");
      body.classList = "collapsible-body";
      body.appendChild(document.createElement("br"));
      body.appendChild(document.createElement("br"));
      if (openedId == courseId) {
        header.classList += " active";
        body.style.display = "block";
        first = false;
      }
      listElement.appendChild(header);
      listElement.appendChild(body);
      classlist.appendChild(listElement);
    }
  } else {
    var listElement = document.createElement("li");
    var header = document.createElement("div");
    header.classList = "collapsible-header";
    header.innerHTML = "No Courses Added";
    listElement.appendChild(header);
    classlist.appendChild(listElement);
  }
  $(".not-collapse").on("click", function(e) { e.stopPropagation(); });
  $('.collapsible').collapsible();
}

function focusSearch() {
  search.focus();
}

function enterPressAlert(e, input) {
  var code = (e.keyCode ? e.keyCode : e.which);
  if(code == 13) { //Enter keycode
    search.blur()
  }
}

function updateCourseTable(curr, data) {
  var table = document.getElementById("course-table-body");
  table.innerHTML = "";
  var numbers = search.val().match(/\d+/g);
  if (numbers != null) {
    if (data != null) {
      for (var i = 0; i < numbers.length; i++) {
        var name = data[numbers[i]];
        if (name != undefined) {
          addRow(table, curr, numbers[i], name);
        }
      }
    }
  } else {
    for (var num in data) {
      var name = data[num];
      addRow(table, curr, num, name);
    }
    window.setTimeout(focusSearch, 100);
  }
}

function addRow(table, curr, num, name) {
  var row = document.createElement('tr');
  var curriculum = document.createElement('td');
  curriculum.appendChild(document.createTextNode(curr));
  curriculum.classList += " table-curr";
  row.appendChild(curriculum);
  var number = document.createElement('td');
  number.appendChild(document.createTextNode(num));
  number.classList += " table-num";
  row.appendChild(number);
  var course_name = document.createElement('td');
  course_name.appendChild(document.createTextNode(name));
  course_name.classList += " table-name";
  row.appendChild(course_name);
  var add = document.createElement('td')
  var icon = document.createElement('i');
  icon.classList += "material-icons class-change-btn right";
  icon.onclick = changeClass;
  icon.dataset.courseNumber = curr.replace(" ", "-") + "_" + num;
  icon.id = curr.replace(" ", "-") + "_" + num; //Redundant
  if (user_courses == null || user_courses[icon.dataset.courseNumber] == null) {
    icon.appendChild(document.createTextNode("add"));
  } else {
    icon.appendChild(document.createTextNode("close"));
  }
  add.appendChild(icon);
  add.classList += " table-add";
  row.appendChild(add);
  table.appendChild(row);
}

function combineStrings(string1, string2) {
  if (string1 < string2) {
    return (string1 + "|" + string2);
  } else {
    return (string2 + "|" + string1);
  }
}
