<template>
    <div class="container-fluid mt-4">
      <div class="mb-3 pb-3 d-flex chat-header justify-content-between align-items-center">
        <div class="d-flex flex-column">
          <span class="mb-0 h2 text-primary">{{roomName}}</span>
          <span class="ml-1" v-if="user &&  user.uid !== hostID"> Hosted by: <strong class="text-danger">{{hostDisplayName}}</strong> </span>
        </div>
        <div class="d-flex" v-if="(user && user.uid === hostID) || attendeeApproved">
          <button class="btn btn-primary mx-1"
                  v-if="!attendeeJoined && attendeeApproved"
                  @click="doJoin"
          >
            Join
          </button>
          <button type="button" class="btn btn-danger mx-1"
                  v-if="attendeeJoined"
                  @click="doLeave"
          >
            Leave
          </button>
        </div>
      </div>

        <div v-if="attendeeApproved">
          <div class="row">
            <div class="col-md-3" >
              <h4>Attendees</h4>
              <ul class="list-unstyled">
                <li v-for="attendee in attendeesApproved" :key="attendee.id">
                  <a type="button" class="mr-2" title="Approve attendee" v-if="user && user.uid === hostID" @click="toggleApproval(attendee.id)">
                    <font-awesome-icon icon="user"></font-awesome-icon>
                  </a>
                  <span class="mr-2 px-2" title="On Air" :class="[attendeeJoined ? 'text-success' : 'text-secondary']">
                    <font-awesome-icon icon="podcast"></font-awesome-icon>
                  </span>
                  <span class="px-2" :class="[attendee.id == user.uid ? 'font-weight-bold text-danger' : '']">{{attendee.displayName}}</span>
                </li>
              </ul>
              <div v-if="user && user.uid === $route.params.hostID">
                <h4 class="mt-4">Pending</h4>
                <ul class="list-unstyled">
                  <li class="mb-1" v-for="attendee in attendeesPending" :key="attendee.id">
                <span>
                  <a type="button" class="mr-2" title="Approve attendee" v-if="user && user.uid === hostID" @click="toggleApproval(attendee.id)">
                    <font-awesome-icon icon="user"></font-awesome-icon>
                  </a>
                  <a type="button" class="text-secondary px-2" title="Delete Attendee" @click="deleteAttendee(attendee.id)">
                    <font-awesome-icon icon="trash"></font-awesome-icon>
                  </a>
                </span>
                    <span class="px-2">{{ attendee.displayName }}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div class="col-md-9 d-flex justify-content-start">

              <vue-webrtc
                  ref="webrtc"
                  width="100%"
                  cameraHeight="600"
                  :roomId="roomID"
                  v-on:joined-room="doAttendeeJoined"
                  v-on:left-room="doAttendeeLeft"
              />
            </div>
          </div>
        </div>
        <div v-else>
          <div class="row">
              <p class="lead text-left" v-if="user">
                Hi <strong class="text-primary font-weight-bold" >{{user.displayName}}</strong>, you're currently in the room
                waiting for the owner of the chat to add you to the meeting. Please wait.
              </p>
          </div>
        </div>
      </div>
  </template>

<script>
import db from '../db.js'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'



export default {
  name: 'Attendees',
  components: {
    FontAwesomeIcon,
  },
  methods: {
    toggleApproval: function(attendeeID) {
      if (this.user && this.user.uid === this.hostID) {
       const ref =  db
          .collection('users')
          .doc(this.user.uid)
          .collection('rooms')
          .doc(this.roomID)
          .collection('attendees')
          .doc(attendeeID)

        ref.get().then(attendeeDoc => {
          const approved = attendeeDoc.data().approved
          if (approved) {
            ref.update({
              approved: !approved
            })
          } else {
            ref.update({
              approved: true
            })
          }
        })
      }
    },
    deleteAttendee: function(attendeeID) {
      if (this.user && this.user.uid === this.hostID) {
        db
        .collection('users')
        .doc(this.user.uid)
        .collection('rooms')
        .doc(this.roomID)
        .collection('attendees')
        .doc(attendeeID)
        .delete()
      }
    },

    doJoin() {
      this.$refs.webrtc.join()
      this.attendeeJoined = true
    },

    doLeave() {
      this.$refs.webrtc.leave()
      this.attendeeJoined = false
    },

    doAttendeeJoined(vidID) {
      const ref = db
        .collection('users')
        .doc(this.hostID)
        .collection('rooms')
        .doc(this.roomID)
        .collection('attendees')
        .doc(this.user.uid)
      ref.update({
        webRTCID: vidID
      })
    },

    doAttendeeLeft(vidID) {
      const ref = db
          .collection('users')
          .doc(this.hostID)
          .collection('rooms')
          .doc(this.roomID)
          .collection('attendees')
          .doc(this.user.uid)
      ref.update({
        webRTCID: null
      })
    }
  },
  props: ['user'],
  data: function() {
    return {
      attendeesPending: [],
      attendeesApproved: [],
      attendeeApproved: false,
      attendeeJoined: false,
      hostID: this.$route.params.hostID,
      roomID: this.$route.params.roomID,
      roomName: null,
      hostDisplayName: null
    }
  },
  mounted() {
    const roomRef = db
    .collection('users')
    .doc(this.hostID)
    .collection('rooms')
    .doc(this.roomID)

    roomRef.get().then(roomDoc => {
      if (roomDoc.exists) {
        this.roomName = roomDoc.data().name
      } else {
        this.$router.replace('/');
      }
    })


    roomRef.collection('attendees').onSnapshot(attendeeSnap => {

      const tempPending = [];
      const tempApproved = [];
      let isCheckedIn = false
      attendeeSnap.forEach((attendeeDoc) => {

        if (this.user.uid === attendeeDoc.id) {
          isCheckedIn = true;
        }

        if (this.hostID === attendeeDoc.id) {
          this.hostDisplayName = attendeeDoc.data().displayName
        }


        if(attendeeDoc.data().approved) {

          if (this.user.uid === attendeeDoc.id) {
            this.attendeeApproved = true;
          }
          tempApproved.push({
            id: attendeeDoc.id,
            displayName: attendeeDoc.data().displayName,
            approved: attendeeDoc.data().approved,
            webRTCID: attendeeDoc.data().webRTCID
          })
        } else {
          if (this.user.uid === attendeeDoc.id) {
            this.attendeeApproved = false;
          }
          tempPending.push({
            id: attendeeDoc.id,
            displayName: attendeeDoc.data().displayName,
            approved: attendeeDoc.data().approved,
            webRTCID: attendeeDoc.data().webRTCID
          })
        }

      })
      this.attendeesPending = tempPending
      this.attendeesApproved = tempApproved

      if (!isCheckedIn) {
        this.$route.push(`/checkin/${this.hostID}/${this.roomID}`)
      }
    })
  }
}
</script>


<style scoped lang="scss">
  .chat-header {
    border-bottom: 1px solid #ddd;
  }

  .video-list {
    margin-bottom: 10px;
    background: transparent !important;
    display: flex;


  }
  .video-item {
    width: 100%;
    display: block;
    background: transparent !important;
  }
  .video-item video {
    width: 100%;
    height: auto;
  }
</style>
